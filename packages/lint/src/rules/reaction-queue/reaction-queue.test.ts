import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { it }            from 'bun:test'
// --------------------------------------------------------
import { eventOfQueue }  from '../../../../core/src/domain/events/event-of-queue/event-of-queue'
import { MODULE }        from '../../testing/testing'
import { ORDER }         from '../../testing/testing'
import { asRule }        from '../../testing/testing'
import { diagnosticsOf } from '../../testing/testing'
import { programOf }     from '../../testing/testing'
import { tester }        from '../../testing/testing'
import { typedTester }   from '../../testing/testing'
import { QUEUE }         from './reaction-queue'
import { reactionQueue } from './reaction-queue'

const WORKERS = `${MODULE}/price-change.workers.ts`
const ORDER_WORKERS = `${ORDER}/order.workers.ts`
const subscribe = (calls: string, queue: string) => `orders.events.placed.subscribe(o => ${calls}, { strategy: 'handler', queue: '${queue}' })`

tester.run('reaction-queue', asRule(reactionQueue), {
  valid: [
    { code: "(changes: PriceChange_Module) => deps.product.events.updated.subscribe(({ dto }) => changes.record(dto), { strategy: 'handler', queue: 'priceChange.record.on.product.updated' })", filename: WORKERS },
    { code: "(changes: PriceChange_Module) => deps.product.events.updated.subscribe(async ({ changes: changed, dto }) => { if (changed.priceCents) await changes.record(dto) }, { strategy: 'handler', queue: 'priceChange.record.on.product.updated' })", filename: WORKERS },
    { code: "deps.product.events.updated.subscribe(() => cache.clear(), { strategy: 'fire-and-forget' })", filename: WORKERS },
    { code: subscribe('orders.fulfil(o.id)', 'order.fulfil.on.order.placed'), filename: ORDER_WORKERS },
    { code: "async function onPlaced(o) { await orders.fulfil(o.id) }\norders.events.placed.subscribe(onPlaced, { strategy: 'handler', queue: 'order.fulfil.on.order.placed' })", filename: ORDER_WORKERS },
    { code: "orders.events.placed.subscribe(orders.fulfilPlaced.bind(orders), { strategy: 'handler', queue: 'order.fulfilPlaced.on.order.placed' })", filename: ORDER_WORKERS },
    { code: "this.events.placed.subscribe(o => this.fulfil(o.id), { strategy: 'handler', queue: 'order.fulfil.on.order.placed' })", filename: `${ORDER}/order.module.ts` },
    { code: "(orders: m.Order_Module) => orders.events.placed.subscribe(o => orders.fulfil(o.id), { strategy: 'handler', queue: 'order.fulfil.on.order.placed' })", filename: ORDER_WORKERS },
    { code: "class W { constructor(private readonly orders: Order_Module) {} register() { this.orders.events.placed.subscribe(o => this.orders.fulfil(o.id), { strategy: 'handler', queue: 'order.fulfil.on.order.placed' }) } }", filename: ORDER_WORKERS },
    { code: "class Order_Module { register() { this.events.placed.subscribe(o => this.fulfil(o.id), { strategy: 'handler', queue: 'order.fulfil.on.order.placed' }) } }", filename: ORDER_WORKERS },
    // `on` derives the queue from the module it is called on: its own.
    { code: "orders.on(orders.events.placed, 'fulfil', o => [o.id])", filename: ORDER_WORKERS },
    { code: "(orders: Order_Module, deps: Order_Deps) => orders.on(deps.product.events.deleted, 'forget', p => [p.id], { attempts: 10 })", filename: ORDER_WORKERS },
    { code: "this.on(this.nightly, 'purge')", filename: `${ORDER}/order.module.ts` },
    { code: "emitter.on('placed', () => {})", filename: ORDER_WORKERS },
    // Without a program, only a key of `events` says the event: a schedule's field is not its name.
    { code: "orders.purgeSchedule.subscribe(() => orders.purge(), { strategy: 'handler', queue: 'order.purge.on.order.nightly' })", filename: ORDER_WORKERS },
    ...[['category', 'categories'], ['address', 'addresses'], ['box', 'boxes'], ['batch', 'batches']].map(([module, plural]) => ({
      code: `deps.brand.events.deleted.subscribe(b => ${plural}.forget(b.id), { strategy: 'handler', queue: '${module}.forget.on.brand.deleted' })`,
      filename: `/repo/src/contexts/shop/modules/${module}/${module}.workers.ts`,
    })),
  ],
  invalid: [
    { code: "(changes: PriceChange_Module) => deps.product.events.updated.subscribe(({ dto }) => changes.record(dto), { strategy: 'handler', queue: 'product.record.on.product.updated' })", filename: WORKERS, errors: [{ messageId: 'module' }] },
    { code: "(changes: PriceChange_Module) => deps.product.events.updated.subscribe(({ dto }) => changes.record(dto), { strategy: 'handler', queue: 'priceChange.remember.on.product.updated' })", filename: WORKERS, errors: [{ messageId: 'useCase' }] },
    { code: "(changes: PriceChange_Module) => deps.product.events.updated.subscribe(({ dto }) => changes.record(dto), { strategy: 'handler', queue: 'priceChange.record.on.product.created' })", filename: WORKERS, errors: [{ messageId: 'event' }] },
    ...['order', 'order.fulfil', 'order.fulfil.now.on.order.placed', 'order.fulfil.on.placed']
      .map(queue => ({ code: subscribe('orders.fulfil(o.id)', queue), filename: ORDER_WORKERS, errors: [{ messageId: 'shape' }] })),
    { code: subscribe('products.fulfil(o.id)', 'order.fulfil.on.order.placed'), filename: ORDER_WORKERS, errors: [{ messageId: 'useCase' }] },
    { code: `(orders: Order_Module, products: Product_Module) => ${subscribe('products.fulfil(o.id)', 'order.fulfil.on.order.placed')}`, filename: ORDER_WORKERS, errors: [{ messageId: 'useCase' }] },
    { code: `(orders: Order_Module, deps: Order_Deps) => ${subscribe('deps.product.fulfil(o.id)', 'order.fulfil.on.order.placed')}`, filename: ORDER_WORKERS, errors: [{ messageId: 'useCase' }] },
    { code: "this.events.placed.subscribe(o => this.fulfil(o.id), { strategy: 'handler', queue: 'mail.fulfil.on.order.placed' })", filename: `${ORDER}/order.module.ts`, errors: [{ messageId: 'module' }] },
    { code: "orders.events.placed.subscribe(o => orders.fulfil(o.id), { strategy: 'handler' as const, queue: 'order.bad' })", filename: ORDER_WORKERS, errors: [{ messageId: 'shape' }] },
    { code: "orders.events.placed.subscribe(o => orders.fulfil(o.id), { strategy: 'handler' satisfies string, queue: 'order.bad' })", filename: ORDER_WORKERS, errors: [{ messageId: 'shape' }] },
    { code: `(orders: m.Product_Module) => ${subscribe('orders.fulfil(o.id)', 'order.fulfil.on.order.placed')}`, filename: ORDER_WORKERS, errors: [{ messageId: 'useCase' }] },
    { code: "class W { register() { this.orders.events.placed.subscribe(o => this.products.fulfil(o.id), { strategy: 'handler', queue: 'order.fulfil.on.order.placed' }) } }", filename: ORDER_WORKERS, errors: [{ messageId: 'useCase' }] },
    { code: "class W { constructor(private readonly orders: Product_Module) {} register() { this.orders.events.placed.subscribe(o => this.orders.fulfil(o.id), { strategy: 'handler', queue: 'order.fulfil.on.order.placed' }) } }", filename: ORDER_WORKERS, errors: [{ messageId: 'useCase' }] },
    // A queue written as a template, or with what only TypeScript sees around it.
    ...['`mail.fulfil.on.order.placed`', "<const>'mail.fulfil.on.order.placed'", "'mail.fulfil.on.order.placed'!"]
      .map(queue => ({ code: `orders.events.placed.subscribe(o => orders.fulfil(o.id), { strategy: \`handler\`, queue: ${queue} })`, filename: ORDER_WORKERS, errors: [{ messageId: 'module' }] })),
    // `on` called on another module would put a reaction of it in this one's files.
    { code: "(orders: Order_Module, products: Product_Module) => products.on(orders.events.placed, 'fulfil', o => [o.id])", filename: ORDER_WORKERS, errors: [{ messageId: 'on' }] },
    { code: "(orders: Order_Module, deps: Order_Deps) => deps.product.on(orders.events.placed, 'fulfil', o => [o.id])", filename: ORDER_WORKERS, errors: [{ messageId: 'on' }] },
    // `this` in a class of the workers is that class, not the module.
    { code: "class W { fulfil(id) {} register(orders) { orders.events.placed.subscribe(o => this.fulfil(o.id), { strategy: 'handler', queue: 'order.fulfil.on.order.placed' }) } }", filename: ORDER_WORKERS, errors: [{ messageId: 'useCase' }] },
  ],
})

const ORDER_TYPED = `${ORDER}/order.module.ts`
const typedModule = `
declare class Emitter { subscribe(handler: (payload: unknown) => unknown, subscription: { strategy: string, queue: string }): () => void }
declare function eventsOf<C>(bus: unknown, classes: C): { readonly [K in keyof C]: Emitter }
declare const base: { bus: unknown, schedules: { define(name: string, cron: string): Emitter } }
export class Order_Placed { static readonly eventName = 'order.placed' }
export class Order_Module {
  readonly events = eventsOf(base.bus, { added: Order_Placed })
  readonly purgeSchedule
  constructor() {
    this.purgeSchedule = base.schedules.define('order.nightly', '0 3 * * *')
    this.events.added.subscribe(() => this.fulfil('x'), { strategy: 'handler', queue: 'order.fulfil.on.order.placed' })
  }
  fulfil(id: string) {}
  purge() {}
}
`
const typedCases: [string, string?][] = [
  // The event is its class's name, or its schedule's, whatever the key it is read from.
  ["export const w = (orders: Order_Module) => orders.events.added.subscribe(() => orders.fulfil('x'), { strategy: 'handler', queue: 'order.fulfil.on.order.placed' })"],
  ["export const w = (orders: Order_Module) => orders.purgeSchedule.subscribe(() => orders.purge(), { strategy: 'handler', queue: 'order.purge.on.order.nightly' })"],
  ["export const w = (orders: Order_Module) => orders.events.added.subscribe(() => orders.fulfil('x'), { strategy: 'handler', queue: 'order.fulfil.on.order.added' })", 'event'],
  ["export const w = (orders: Order_Module) => orders.purgeSchedule.subscribe(() => orders.purge(), { strategy: 'handler', queue: 'order.purge.on.order.purgeSchedule' })", 'event'],
  ["export class W { fulfil(id: string) {} register(orders: Order_Module) { orders.events.added.subscribe(() => this.fulfil('x'), { strategy: 'handler', queue: 'order.fulfil.on.order.placed' }) } }", 'useCase'],
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
  it('newt takes every queue the lint takes, for the event the lint read', () => {
    let taken = 0
    for (const queue of queues(PARTS)) {
      const shape = QUEUE.exec(queue)
      if (!shape) continue
      taken++
      expect({ queue, event: eventOfQueue(queue) }).toEqual({ queue, event: shape[3] })
    }
    // The sample reaches the lint's shape often enough to say something.
    expect(taken).toBeGreaterThan(500)
  })

  it('the lint refuses what newt takes only for its event, which is a module and one of its events', () => {
    for (const queue of ['order.fulfil.on.placed', 'order.fulfil.on.order.placed.again', 'order.fulfil.on.order.pla ced']) {
      expect(eventOfQueue(queue)).toBeDefined()
      expect(QUEUE.test(queue)).toBe(false)
    }
  })
})
