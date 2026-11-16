import { describe }            from 'bun:test'
import { expect }              from 'bun:test'
import { test }                from 'bun:test'
// --------------------------------------------------------
import { EventId }             from '../../value-objects/event-id/event-id'
import type { EventBus }       from '../bus/event-bus'
import type { EventHandler }   from '../bus/event-handler'
import type { DomainEvent }    from '../event/domain-event'
import type { PublishedEvent } from '../event/published-event'
import type { EventSource }    from '../subscription/event-source'
import type { Subscription }   from '../subscription/subscription'
import { DomainEventEmitter }  from './domain-event-emitter'

class Placed implements DomainEvent<{ id: string }> {
  static readonly eventName = 'order.placed'
  readonly id = 'e1' as EventId
  readonly actor = null
  readonly name = Placed.eventName
  readonly occurredAt = ''
  constructor(readonly payload: { id: string }) {}
}

function recordingBus() {
  const subscriptions: { pattern: string, handler: EventHandler, options?: Subscription | undefined }[] = []
  const unsubscribes: (() => void)[] = []
  const bus: EventBus = {
    publish: () => {},
    subscribe: (pattern, handler, options) => {
      subscriptions.push({ pattern, handler, options })
      const unsubscribe = () => {}
      unsubscribes.push(unsubscribe)
      return unsubscribe
    },
  }
  return { bus, subscriptions, unsubscribes }
}

describe('DomainEventEmitter.subscribe', () => {
  test('a handler subscribes durably, on the queue it names', async () => {
    const { bus, subscriptions } = recordingBus()
    const seen: unknown[] = []
    const placed = new DomainEventEmitter(bus, Placed)

    placed.subscribe(order => seen.push(order), { strategy: 'handler', queue: 'notification.orderPlaced.on.order.placed' })
    placed.subscribe(order => seen.push(order.id), { strategy: 'handler', queue: 'notification.remind.on.order.placed', attempts: 2 })
    for (const { handler } of subscriptions) {
      await handler(new Placed({ id: 'o1' }))
    }

    expect(subscriptions.map(each => [each.pattern, each.options])).toEqual([
      ['order.placed', { strategy: 'handler', queue: 'notification.orderPlaced.on.order.placed' }],
      ['order.placed', { strategy: 'handler', queue: 'notification.remind.on.order.placed', attempts: 2 }],
    ])
    expect(seen).toEqual([{ id: 'o1' }, 'o1'])
  })

  test('a fire-and-forget subscription stays in memory', async () => {
    const { bus, subscriptions } = recordingBus()
    const seen: unknown[] = []

    new DomainEventEmitter(bus, Placed).subscribe(order => seen.push(order), { strategy: 'fire-and-forget' })
    await subscriptions[0]!.handler(new Placed({ id: 'o1' }))

    expect(subscriptions[0]?.options).toEqual({ strategy: 'fire-and-forget' })
    expect(seen).toEqual([{ id: 'o1' }])
  })

  test("hands every handler the event's id, name, time and who told it beside its payload, whatever the strategy", async () => {
    const { bus, subscriptions } = recordingBus()
    const placed = new DomainEventEmitter(bus, Placed)
    const seen: unknown[] = []

    placed.subscribe((_, meta) => seen.push(meta), { strategy: 'fire-and-forget' })
    placed.subscribe((_, meta) => seen.push(meta), { strategy: 'handler', queue: 'notification.orderPlaced.on.order.placed' })
    for (const { handler } of subscriptions) {
      await handler({ id: 'e7' as EventId, name: 'order.placed', payload: { id: 'o1' }, occurredAt: '2026-01-01T00:00:00.000Z', actor: 'u1' })
    }
    for (const { handler } of subscriptions) {
      await handler({ id: 'e8', name: 'order.placed', payload: { id: 'o2' }, occurredAt: '2026-01-01T00:00:00.000Z' } as unknown as PublishedEvent)
    }

    expect(seen).toEqual([
      { id: 'e7', name: 'order.placed', occurredAt: '2026-01-01T00:00:00.000Z', actor: 'u1' },
      { id: 'e7', name: 'order.placed', occurredAt: '2026-01-01T00:00:00.000Z', actor: 'u1' },
      { id: 'e8', name: 'order.placed', occurredAt: '2026-01-01T00:00:00.000Z', actor: null },
      { id: 'e8', name: 'order.placed', occurredAt: '2026-01-01T00:00:00.000Z', actor: null },
    ])
  })

  test("refuses a queue that does not say who reacts with what to this event", () => {
    const placed = new DomainEventEmitter(recordingBus().bus, Placed)

    expect(() => placed.subscribe(() => {}, { strategy: 'handler', queue: 'notification.orderPlaced.on.order.confirmed' })).toThrow('<module>.<use case>.on.order.placed')
    expect(() => placed.subscribe(() => {}, { strategy: 'handler', queue: 'notification.order.placed.on.order.placed' })).toThrow()
  })

  test('refuses the queue the worker would refuse: a module or use case in upper case', () => {
    const placed = new DomainEventEmitter(recordingBus().bus, Placed)

    expect(() => placed.subscribe(() => {}, { strategy: 'handler', queue: 'Notification.orderPlaced.on.order.placed' })).toThrow()
    expect(() => placed.subscribe(() => {}, { strategy: 'handler', queue: 'notification.OrderPlaced.on.order.placed' })).toThrow()
  })
})

describe('DomainEventEmitter.subscribe, when', () => {
  test('is handed to the bus, whatever the strategy, which hears only the events it takes, by their payload', () => {
    const { bus, subscriptions } = recordingBus()
    const placed = new DomainEventEmitter(bus, Placed)

    placed.subscribe(() => {}, { strategy: 'fire-and-forget', when: order => order.id !== 'o2' })
    placed.subscribe(() => {}, { strategy: 'handler', queue: 'notification.orderPlaced.on.order.placed', when: order => order.id !== 'o2' })
    placed.subscribe(() => {}, { strategy: 'handler', queue: 'notification.remind.on.order.placed' })
    const [inMemory, taking, all] = subscriptions.map(each => each.options!)

    for (const each of [inMemory, taking]) {
      expect([each!.when?.({ id: 'o1' }), each!.when?.({ id: 'o2' })]).toEqual([true, false])
    }
    expect(all!.when).toBeUndefined()
  })

  test('a type guard narrows what the handler gets', async () => {
    type Line = { sku: string, giftNote: string | null }
    class Added implements DomainEvent<Line> {
      static readonly eventName = 'cart.added'
      readonly id = 'e1' as EventId
      readonly actor = null
      readonly name = Added.eventName
      readonly occurredAt = ''
      constructor(readonly payload: Line) {}
    }
    const { bus, subscriptions } = recordingBus()
    const notes: string[] = []

    new DomainEventEmitter(bus, Added).subscribe(line => notes.push(line.giftNote.toUpperCase()), {
      strategy: 'fire-and-forget',
      when: (line: Line): line is Line & { giftNote: string } => line.giftNote !== null,
    })
    expect(subscriptions[0]!.options!.when?.({ sku: 'a', giftNote: null })).toBe(false)
    await subscriptions[0]!.handler(new Added({ sku: 'b', giftNote: 'enjoy' }))

    expect(notes).toEqual(['ENJOY'])
  })
})

describe('DomainEventEmitter.subscribe, further', () => {
  test('hands back what unsubscribes it, whatever the strategy', () => {
    const { bus, unsubscribes } = recordingBus()
    const placed = new DomainEventEmitter(bus, Placed)

    const inMemory = placed.subscribe(() => {}, { strategy: 'fire-and-forget' })
    const durable = placed.subscribe(() => {}, { strategy: 'handler', queue: 'notification.orderPlaced.on.order.placed' })

    expect(inMemory).toBe(unsubscribes[0]!)
    expect(durable).toBe(unsubscribes[1]!)
  })

  test('waits for an async handler, and lets its failure through, whatever the strategy', async () => {
    const { bus, subscriptions } = recordingBus()
    const placed = new DomainEventEmitter(bus, Placed)
    const done: string[] = []
    const slow = async () => {
      await Bun.sleep(1)
      done.push('handled')
    }

    placed.subscribe(slow, { strategy: 'fire-and-forget' })
    placed.subscribe(slow, { strategy: 'handler', queue: 'notification.orderPlaced.on.order.placed' })
    placed.subscribe(async () => {
      throw new Error('boom')
    }, { strategy: 'fire-and-forget' })
    placed.subscribe(async () => {
      throw new Error('boom')
    }, { strategy: 'handler', queue: 'notification.fail.on.order.placed' })

    await subscriptions[0]!.handler(new Placed({ id: 'o1' }))
    await subscriptions[1]!.handler(new Placed({ id: 'o1' }))
    expect(done).toEqual(['handled', 'handled'])
    await expect(subscriptions[2]!.handler(new Placed({ id: 'o1' }))).rejects.toThrow('boom')
    await expect(subscriptions[3]!.handler(new Placed({ id: 'o1' }))).rejects.toThrow('boom')
  })
})

describe('a payload', () => {
  test('is JSON, as a handler gets it back from its stored job: a Date is not', () => {
    // @ts-expect-error a Date would reach a `handler` as a string
    class Due implements DomainEvent<{ dueAt: Date }> {
      static readonly eventName = 'invoice.due'
      readonly name = Due.eventName
      readonly occurredAt = ''
      constructor(readonly payload: { dueAt: Date }) {}
    }
    class DueOn implements DomainEvent<{ dueAt: string, paidAt?: string }> {
      static readonly eventName = 'invoice.due'
      readonly name = DueOn.eventName
      readonly occurredAt = ''
      constructor(readonly payload: { dueAt: string, paidAt?: string }) {}
    }

    expect(new DomainEventEmitter(recordingBus().bus, DueOn).name).toBe(Due.eventName)
  })
})

describe('an EventSource', () => {
  test('is what a dependency needs of an emitter: an emitter fits it, and so does a stand-in', () => {
    const { bus, subscriptions } = recordingBus()
    const placed: EventSource<{ id: string }> = new DomainEventEmitter(bus, Placed)
    const standIn: EventSource<{ id: string }> = { subscribe: () => () => {} }
    // @ts-expect-error another payload is another source
    const other: EventSource<{ number: number }> = placed

    placed.subscribe(() => {}, { strategy: 'fire-and-forget' })
    expect(subscriptions).toHaveLength(1)
    expect([standIn, other]).toHaveLength(2)
  })
})
