import { describe }            from 'bun:test'
import { expect }              from 'bun:test'
import { test }                from 'bun:test'
// --------------------------------------------------------
import { MemoryCluster }       from '../../../adapters/cluster/memory/memory-cluster/memory-cluster'
import { MemoryDatabase }      from '../../../adapters/database/memory/memory-database/memory-database'
import { now }                 from '../../../domain/clock/now/now'
import type { DomainEvent }    from '../../../domain/events/event/domain-event'
import { eventsOf }            from '../../../domain/events/events-of/events-of'
import type { EventSource }    from '../../../domain/events/subscription/event-source'
import { Module }              from '../../../domain/module/module/module'
import { UseCase }             from '../../../domain/use-case/use-case/use-case'
import { ContextBase }         from '../../context/context-base/context-base'
import { Platform }            from '../../platform/platform/platform'
import { describeApplication } from './describe-application'

const platform = new Platform({ cluster: new MemoryCluster() })

class Order_Placed implements DomainEvent<{ id: string }> {
  static readonly eventName = 'order.placed'
  readonly name = Order_Placed.eventName
  readonly occurredAt = now().toISOString()
  constructor(readonly payload: { id: string }) {}
}

class Product_Module extends Module {
  constructor(base: ContextBase) {
    super('product', base.useCaseRunner)
  }

  @UseCase()
  async get() {}
}

type Order_Deps = { product: Product_Module, payments: { charge: () => Promise<void> }, billing: { invoice: Invoice_Module } }

class Order_Module extends Module {
  readonly events
  readonly nightly

  constructor(base: ContextBase, private readonly deps: Order_Deps) {
    super('order', base.useCaseRunner, deps)
    this.events = eventsOf(base.bus, { placed: Order_Placed })
    this.nightly = base.schedules.define('order.nightly', '0 3 * * *')
  }

  @UseCase()
  async place() {}

  @UseCase({ retryOnConflict: false })
  async cancel() {}
}

class Invoice_Module extends Module {
  readonly orders: EventSource<{ id: string }>

  constructor(base: ContextBase, deps: { orders: Order_Module['events'] }) {
    super('invoice', base.useCaseRunner, deps)
    this.orders = deps.orders.placed
  }

  @UseCase()
  async open() {}
}

function contexts() {
  const shop = new ContextBase({ name: 'shop', platform, database: new MemoryDatabase() })
  const billing = new ContextBase({ name: 'billing', platform, database: new MemoryDatabase() })
  const product = new Product_Module(shop)
  const deps: Order_Deps = { product, payments: { charge: async () => {} }, billing: { invoice: undefined as never } }
  const order = new Order_Module(shop, deps)
  deps.billing.invoice = new Invoice_Module(billing, { orders: order.events })
  order.events.placed.subscribe(() => {}, { strategy: 'handler', queue: 'invoice.open.on.order.placed', attempts: 3, when: () => true })
  order.events.placed.subscribe(() => {}, { strategy: 'fire-and-forget' })
  return { shop, billing }
}

describe('describeApplication', () => {
  test('lists each context with its modules, their use cases and the events they tell, schedules among them', () => {
    const [shop] = describeApplication(Object.values(contexts())).contexts

    expect(shop!.name).toBe('shop')
    expect(shop!.modules.map(module => module.id)).toEqual(['shop/product', 'shop/order'])
    const order = shop!.modules[1]!
    expect(order.className).toBe('Order_Module')
    expect(order.useCases).toEqual([
      { id: 'shop/order.place', name: 'order.place', retryOnConflict: true },
      { id: 'shop/order.cancel', name: 'order.cancel', retryOnConflict: false },
    ])
    expect(order.events).toEqual([
      { id: 'shop/order.placed', name: 'order.placed', schedule: null },
      { id: 'shop/order.nightly', name: 'order.nightly', schedule: { cron: '0 3 * * *' } },
    ])
  })

  test('tells what each module depends on: modules of any context, events of another module, and ports', () => {
    const [shop, billing] = describeApplication(Object.values(contexts())).contexts

    expect(shop!.modules[1]!.deps).toEqual([
      { name: 'product', kind: 'module', target: 'shop/product' },
      { name: 'payments', kind: 'port', target: null },
      { name: 'billing.invoice', kind: 'module', target: 'billing/invoice' },
    ])
    const invoice = billing!.modules[0]!
    expect(invoice.deps).toEqual([{ name: 'orders', kind: 'events', target: 'shop/order', events: ['order.placed'] }])
    expect(invoice.events).toEqual([])
    expect(shop!.uses).toEqual(['billing'])
    expect(billing!.uses).toEqual(['shop'])
  })

  test('says it in the same bytes as before: a monitor takes a new version of a structure whose hash changed', () => {
    const json = JSON.stringify(describeApplication(Object.values(contexts())))

    expect(new Bun.CryptoHasher('sha256').update(json).digest('hex')).toBe('22a50ff2927943d7c3fa04b3efbcd96eeae37903a9b925340167f67f20120499')
  })

  test('finds modules and events however deep its deps hold them, and keeps a port of plain objects one port', () => {
    const shop = new ContextBase({ name: 'shop', platform, database: new MemoryDatabase() })
    const product = new Product_Module(shop)
    const order = new Order_Module(shop, { product, payments: { charge: async () => {} }, billing: { invoice: undefined as never } })
    class Deep_Module extends Module {
      constructor(base: ContextBase, deps: object) {
        super('deep', base.useCaseRunner, deps)
      }
    }
    const loop: Record<string, unknown> = { product }
    loop.self = loop
    new Deep_Module(shop, {
      far: { away: { product, placed: order.events.placed } },
      mailer: { send: async () => {}, smtp: { host: 'mail', tls: { port: 465 } } },
      loop,
      list: [product],
      byName: new Map([['product', product]]),
    })

    const deep = describeApplication([shop]).contexts[0]!.modules.find(module => module.name === 'deep')!
    expect(deep.deps).toEqual([
      { name: 'far.away.product', kind: 'module', target: 'shop/product' },
      { name: 'far.away.placed', kind: 'events', target: 'shop/order', events: ['order.placed'] },
      { name: 'mailer', kind: 'port', target: null },
      { name: 'loop.product', kind: 'module', target: 'shop/product' },
      { name: 'list', kind: 'port', target: null },
      { name: 'byName', kind: 'port', target: null },
    ])
    expect(deep.events).toEqual([])
  })

  test('knows a module and an emitter of another installed copy of newt by their brand, which instanceof does not see', () => {
    const shop = new ContextBase({ name: 'shop', platform, database: new MemoryDatabase() })
    const elsewhere = { name: 'tax', useCaseRunner: { registry: { context: 'billing' } }, [Symbol.for('@newt-js/core/module')]: true }
    const told = { name: 'tax.changed', [Symbol.for('@newt-js/core/event-emitter')]: true }
    expect(elsewhere instanceof Module).toBe(false)
    class Copy_Module extends Module {
      constructor(base: ContextBase, deps: object) {
        super('copy', base.useCaseRunner, deps)
      }
    }
    new Copy_Module(shop, { billing: { tax: elsewhere }, changed: told })

    expect(describeApplication([shop]).contexts[0]!.modules[0]!.deps).toEqual([
      { name: 'billing.tax', kind: 'module', target: 'billing/tax' },
      { name: 'changed', kind: 'events', target: null, events: ['tax.changed'] },
    ])
  })

  test('lists the subscriptions to its events, and forgets one unsubscribed', () => {
    const { shop, billing } = contexts()

    expect(describeApplication([shop, billing]).contexts[0]!.subscriptions).toEqual([
      { event: 'shop/order.placed', strategy: 'handler', queue: 'invoice.open.on.order.placed', handler: 'invoice.open', attempts: 3, filtered: true },
      { event: 'shop/order.placed', strategy: 'fire-and-forget', queue: null, handler: null, attempts: null, filtered: null },
    ])
    shop.bus.subscribe('order.placed', () => {})()
    expect(describeApplication([shop]).contexts[0]!.subscriptions).toHaveLength(2)
  })

  test('takes the place of a module built again in its context, and knows none that passed no deps of any', () => {
    const shop = new ContextBase({ name: 'shop', platform, database: new MemoryDatabase() })
    new Product_Module(shop)
    const again = new Product_Module(shop)

    const [product] = describeApplication([shop]).contexts[0]!.modules
    expect(product!.useCases.map(useCase => useCase.name)).toEqual(['product.get'])
    expect(product!.deps).toEqual([])
    expect(shop.useCaseRunner.registry.registeredModules[0]!.instance).toBe(again)
  })
})
