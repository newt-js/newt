import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { it }            from 'bun:test'
// --------------------------------------------------------
import { eventOfQueue }  from '../../../../core/src/domain/events/event-of-queue/event-of-queue'
import { MODULE }        from '../../testing/testing'
import { ORDER }         from '../../testing/testing'
import { TEMPLATE }      from '../../testing/testing'
import { asRule }        from '../../testing/testing'
import { diagnosticsOf } from '../../testing/testing'
import { programOf }     from '../../testing/testing'
import { tester }        from '../../testing/testing'
import { typedTester }   from '../../testing/testing'
import { FEATURE_QUEUE } from './reaction-queue'
import { reactionQueue } from './reaction-queue'

const WORKERS = `${MODULE}/price-change.workers.ts`
const ORDER_WORKERS = `${ORDER}/order.workers.ts`
const TEMPLATE_WORKERS = `${TEMPLATE}/template.workers.ts`
const subscribe = (calls: string, queue: string) => `orders.events.placed.subscribe(o => ${calls}, { strategy: 'handler', queue: '${queue}' })`

tester.run('reaction-queue', asRule(reactionQueue), {
  valid: [
    { code: "(changes: PriceChange_Module) => deps.product.events.updated.subscribe(({ dto }) => changes.record(dto), { strategy: 'handler', queue: 'prices[priceChange].record_on_prices[product].updated' })", filename: WORKERS },
    { code: "(changes: PriceChange_Module) => deps.product.events.updated.subscribe(async ({ changes: changed, dto }) => { if (changed.priceCents) await changes.record(dto) }, { strategy: 'handler', queue: 'prices[priceChange].record_on_prices[product].updated' })", filename: WORKERS },
    { code: "deps.product.events.updated.subscribe(() => cache.clear(), { strategy: 'fire-and-forget' })", filename: WORKERS },
    { code: subscribe('orders.fulfil(o.id)', 'orders[order].fulfil_on_orders[order].placed'), filename: ORDER_WORKERS },
    { code: "async function onPlaced(o) { await orders.fulfil(o.id) }\norders.events.placed.subscribe(onPlaced, { strategy: 'handler', queue: 'orders[order].fulfil_on_orders[order].placed' })", filename: ORDER_WORKERS },
    { code: "orders.events.placed.subscribe(orders.fulfilPlaced.bind(orders), { strategy: 'handler', queue: 'orders[order].fulfilPlaced_on_orders[order].placed' })", filename: ORDER_WORKERS },
    { code: "this.events.placed.subscribe(o => this.fulfil(o.id), { strategy: 'handler', queue: 'orders[order].fulfil_on_orders[order].placed' })", filename: `${ORDER}/order.module.ts` },
    { code: "(orders: m.Order_Module) => orders.events.placed.subscribe(o => orders.fulfil(o.id), { strategy: 'handler', queue: 'orders[order].fulfil_on_orders[order].placed' })", filename: ORDER_WORKERS },
    { code: "class W { constructor(private readonly orders: Order_Module) {} register() { this.orders.events.placed.subscribe(o => this.orders.fulfil(o.id), { strategy: 'handler', queue: 'orders[order].fulfil_on_orders[order].placed' }) } }", filename: ORDER_WORKERS },
    { code: "class Order_Module { register() { this.events.placed.subscribe(o => this.fulfil(o.id), { strategy: 'handler', queue: 'orders[order].fulfil_on_orders[order].placed' }) } }", filename: ORDER_WORKERS },
    // A module of a feature: its queue starts with <feature>[<module>] and says _on_.
    { code: "deps.contacts.contact.events.created.subscribe(c => templates.welcome(c.id), { strategy: 'handler', queue: 'campaigns[template].welcome_on_contacts[contact].created' })", filename: TEMPLATE_WORKERS },
    { code: "this.events.created.subscribe(t => this.index(t.id), { strategy: 'handler', queue: 'campaigns[template].index_on_campaigns[template].created' })", filename: `${TEMPLATE}/template.module.ts` },
    // `on` derives the queue from the module it is called on: its own.
    { code: "orders.on(orders.events.placed, 'fulfil', o => [o.id])", filename: ORDER_WORKERS },
    { code: "(orders: Order_Module, deps: Order_Deps) => orders.on(deps.product.events.deleted, 'forget', p => [p.id], { attempts: 10 })", filename: ORDER_WORKERS },
    { code: "this.on(this.nightly, 'purge')", filename: `${ORDER}/order.module.ts` },
    { code: "emitter.on('placed', () => {})", filename: ORDER_WORKERS },
    // Without a program, only a key of `events` says the event: a schedule's field is not its name.
    { code: "orders.purgeSchedule.subscribe(() => orders.purge(), { strategy: 'handler', queue: 'orders[order].purge_on_orders[order].nightly' })", filename: ORDER_WORKERS },
    ...[['category', 'categories'], ['address', 'addresses'], ['box', 'boxes'], ['batch', 'batches']].map(([module, plural]) => ({
      code: `deps.brand.events.deleted.subscribe(b => ${plural}.forget(b.id), { strategy: 'handler', queue: 'catalog[${module}].forget_on_catalog[brand].deleted' })`,
      filename: `/repo/src/contexts/shop/features/catalog/modules/${module}/${module}.workers.ts`,
    })),
  ],
  invalid: [
    { code: "(changes: PriceChange_Module) => deps.product.events.updated.subscribe(({ dto }) => changes.record(dto), { strategy: 'handler', queue: 'prices[product].record_on_prices[product].updated' })", filename: WORKERS, errors: [{ messageId: 'module' }] },
    { code: "(changes: PriceChange_Module) => deps.product.events.updated.subscribe(({ dto }) => changes.record(dto), { strategy: 'handler', queue: 'prices[priceChange].remember_on_prices[product].updated' })", filename: WORKERS, errors: [{ messageId: 'useCase' }] },
    { code: "(changes: PriceChange_Module) => deps.product.events.updated.subscribe(({ dto }) => changes.record(dto), { strategy: 'handler', queue: 'prices[priceChange].record_on_prices[product].created' })", filename: WORKERS, errors: [{ messageId: 'event' }] },
    // The queue of a module of no feature, `.on.` between its parts, is no handler's queue.
    ...['orders[order]', 'orders[order].fulfil', 'orders[order].fulfil.now_on_orders[order].placed', 'orders[order].fulfil_on_placed', 'order.fulfil.on.order.placed']
      .map(queue => ({ code: subscribe('orders.fulfil(o.id)', queue), filename: ORDER_WORKERS, errors: [{ messageId: 'shape' }] })),
    { code: subscribe('products.fulfil(o.id)', 'orders[order].fulfil_on_orders[order].placed'), filename: ORDER_WORKERS, errors: [{ messageId: 'useCase' }] },
    // A module of a feature: the queue of a module of none, another module's, another feature's, another event's.
    {
      code: "deps.contacts.contact.events.created.subscribe(c => templates.welcome(c.id), { strategy: 'handler', queue: 'template.welcome.on.contacts[contact].created' })",
      filename: TEMPLATE_WORKERS,
      errors: [{ messageId: 'shape', data: { queue: 'template.welcome.on.contacts[contact].created', shape: '<feature>[<module>].<use case>_on_<event>', example: 'shipping[delivery].prepare_on_sales[order].placed' } }],
    },
    { code: "deps.contacts.contact.events.created.subscribe(c => templates.welcome(c.id), { strategy: 'handler', queue: 'emails[template].welcome_on_contacts[contact].created' })", filename: TEMPLATE_WORKERS, errors: [{ messageId: 'module', data: { module: 'campaigns[template]', found: 'emails[template]', file: 'template.workers.ts' } }] },
    { code: "deps.contacts.contact.events.created.subscribe(c => templates.welcome(c.id), { strategy: 'handler', queue: 'campaigns[tag].welcome_on_contacts[contact].created' })", filename: TEMPLATE_WORKERS, errors: [{ messageId: 'module' }] },
    { code: "deps.contacts.contact.events.created.subscribe(c => templates.welcome(c.id), { strategy: 'handler', queue: 'campaigns[template].welcome_on_contacts[contact].deleted' })", filename: TEMPLATE_WORKERS, errors: [{ messageId: 'event', data: { on: '_on_', event: '….created' } }] },
    { code: `(orders: Order_Module, products: Product_Module) => ${subscribe('products.fulfil(o.id)', 'orders[order].fulfil_on_orders[order].placed')}`, filename: ORDER_WORKERS, errors: [{ messageId: 'useCase' }] },
    { code: `(orders: Order_Module, deps: Order_Deps) => ${subscribe('deps.product.fulfil(o.id)', 'orders[order].fulfil_on_orders[order].placed')}`, filename: ORDER_WORKERS, errors: [{ messageId: 'useCase' }] },
    { code: "this.events.placed.subscribe(o => this.fulfil(o.id), { strategy: 'handler', queue: 'orders[mail].fulfil_on_orders[order].placed' })", filename: `${ORDER}/order.module.ts`, errors: [{ messageId: 'module' }] },
    { code: "orders.events.placed.subscribe(o => orders.fulfil(o.id), { strategy: 'handler' as const, queue: 'orders[order].bad' })", filename: ORDER_WORKERS, errors: [{ messageId: 'shape' }] },
    { code: "orders.events.placed.subscribe(o => orders.fulfil(o.id), { strategy: 'handler' satisfies string, queue: 'orders[order].bad' })", filename: ORDER_WORKERS, errors: [{ messageId: 'shape' }] },
    { code: `(orders: m.Product_Module) => ${subscribe('orders.fulfil(o.id)', 'orders[order].fulfil_on_orders[order].placed')}`, filename: ORDER_WORKERS, errors: [{ messageId: 'useCase' }] },
    { code: "class W { register() { this.orders.events.placed.subscribe(o => this.products.fulfil(o.id), { strategy: 'handler', queue: 'orders[order].fulfil_on_orders[order].placed' }) } }", filename: ORDER_WORKERS, errors: [{ messageId: 'useCase' }] },
    { code: "class W { constructor(private readonly orders: Product_Module) {} register() { this.orders.events.placed.subscribe(o => this.orders.fulfil(o.id), { strategy: 'handler', queue: 'orders[order].fulfil_on_orders[order].placed' }) } }", filename: ORDER_WORKERS, errors: [{ messageId: 'useCase' }] },
    // A queue written as a template, or with what only TypeScript sees around it.
    ...['`orders[mail].fulfil_on_orders[order].placed`', "<const>'orders[mail].fulfil_on_orders[order].placed'", "'orders[mail].fulfil_on_orders[order].placed'!"]
      .map(queue => ({ code: `orders.events.placed.subscribe(o => orders.fulfil(o.id), { strategy: \`handler\`, queue: ${queue} })`, filename: ORDER_WORKERS, errors: [{ messageId: 'module' }] })),
    // `on` called on another module would put a reaction of it in this one's files.
    { code: "(orders: Order_Module, products: Product_Module) => products.on(orders.events.placed, 'fulfil', o => [o.id])", filename: ORDER_WORKERS, errors: [{ messageId: 'on' }] },
    { code: "(orders: Order_Module, deps: Order_Deps) => deps.product.on(orders.events.placed, 'fulfil', o => [o.id])", filename: ORDER_WORKERS, errors: [{ messageId: 'on' }] },
    // `this` in a class of the workers is that class, not the module.
    { code: "class W { fulfil(id) {} register(orders) { orders.events.placed.subscribe(o => this.fulfil(o.id), { strategy: 'handler', queue: 'orders[order].fulfil_on_orders[order].placed' }) } }", filename: ORDER_WORKERS, errors: [{ messageId: 'useCase' }] },
  ],
})

const ORDER_TYPED = `${ORDER}/order.module.ts`
const typedModule = `
declare class Emitter { subscribe(handler: (payload: unknown) => unknown, subscription: { strategy: string, queue: string }): () => void }
declare function eventsOf<C>(bus: unknown, classes: C): { readonly [K in keyof C]: Emitter }
declare const base: { bus: unknown, schedules: { define(name: string, cron: string): Emitter } }
export class Order_Placed { static readonly eventName = 'orders[order].placed' }
export class Order_Module {
  readonly events = eventsOf(base.bus, { added: Order_Placed })
  readonly purgeSchedule
  constructor() {
    this.purgeSchedule = base.schedules.define('orders[order].nightly', '0 3 * * *')
    this.events.added.subscribe(() => this.fulfil('x'), { strategy: 'handler', queue: 'orders[order].fulfil_on_orders[order].placed' })
  }
  fulfil(id: string) {}
  purge() {}
}
`
const typedCases: [string, string?][] = [
  // The event is its class's name, or its schedule's, whatever the key it is read from.
  ["export const w = (orders: Order_Module) => orders.events.added.subscribe(() => orders.fulfil('x'), { strategy: 'handler', queue: 'orders[order].fulfil_on_orders[order].placed' })"],
  ["export const w = (orders: Order_Module) => orders.purgeSchedule.subscribe(() => orders.purge(), { strategy: 'handler', queue: 'orders[order].purge_on_orders[order].nightly' })"],
  ["export const w = (orders: Order_Module) => orders.events.added.subscribe(() => orders.fulfil('x'), { strategy: 'handler', queue: 'orders[order].fulfil_on_orders[order].added' })", 'event'],
  ["export const w = (orders: Order_Module) => orders.purgeSchedule.subscribe(() => orders.purge(), { strategy: 'handler', queue: 'orders[order].purge_on_orders[order].purgeSchedule' })", 'event'],
  ["export class W { fulfil(id: string) {} register(orders: Order_Module) { orders.events.added.subscribe(() => this.fulfil('x'), { strategy: 'handler', queue: 'orders[order].fulfil_on_orders[order].placed' }) } }", 'useCase'],
]
const cases = typedCases.map(([code, error], index) => ({ code: `import type { Order_Module } from './order.module'\n${code}`, filename: `${ORDER}/order${index}.workers.ts`, error }))
const program = programOf({ [ORDER_TYPED]: typedModule, ...Object.fromEntries(cases.map(({ filename, code }) => [filename, code])) })

typedTester(program).run('reaction-queue, typed', asRule(reactionQueue), {
  valid: [{ code: typedModule, filename: ORDER_TYPED }, ...cases.filter(each => !each.error).map(({ code, filename }) => ({ code, filename }))],
  invalid: cases.filter(each => each.error).map(({ code, filename, error }) => ({ code, filename, errors: [{ messageId: error! }] })),
})

describe('the program reaction-queue is typed with', () => {
  it('has no errors of its own', () => {
    expect(diagnosticsOf(program)).toEqual([])
  })
})

/** Every queue built from `parts`, as `<module>.<use case>.on.<event>`: near misses (an empty one, a capital first, a space, a dot more) are among them. */
function* queues(parts: string[]): Generator<string> {
  for (const module of parts) {
    for (const useCase of parts) {
      for (const first of parts) {
        yield `${module}.${useCase}.on.${first}`
        for (const second of parts) yield `${module}.${useCase}.on.${first}.${second}`
      }
    }
  }
}

const PARTS = ['order', 'priceChange', 'a1', 'Order', '1a', '', 'on', 'b c', 'a-b', 'a_b', 'x.y', 'ñu', 'a ', '$']

describe("the lint's queue and newt's", () => {
  it("newt takes every queue of a feature's module the lint takes, for the event the lint read", () => {
    let taken = 0
    for (const queue of queues(PARTS)) {
      const [feature = '', module = '', ...rest] = queue.split('.')
      const featured = `${feature}[${module}].${rest.join('.').replace('.on.', '_on_')}`
      const shape = FEATURE_QUEUE.exec(featured)
      if (!shape) continue
      taken++
      expect({ queue: featured, event: eventOfQueue(featured) }).toEqual({ queue: featured, event: shape[3] })
    }
    expect(taken).toBeGreaterThan(100)
  })

  it('neither takes the queue of a module of no feature', () => {
    expect(eventOfQueue('order.fulfil.on.order.placed')).toBeUndefined()
    expect(FEATURE_QUEUE.test('order.fulfil.on.order.placed')).toBe(false)
  })

  it('the lint refuses what newt takes only for its event, which is a module and one of its events', () => {
    for (const queue of ['orders[order].fulfil_on_placed', 'orders[order].fulfil_on_orders[order].placed.again', 'orders[order].fulfil_on_orders[order].pla ced']) {
      expect(eventOfQueue(queue)).toBeDefined()
      expect(FEATURE_QUEUE.test(queue)).toBe(false)
    }
  })
})
