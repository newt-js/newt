import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { test }              from 'bun:test'
import { z }                 from 'zod'
// --------------------------------------------------------
import type { EventBus }     from '../../events/bus/event-bus'
import type { EventHandler } from '../../events/bus/event-handler'
import { defineEvent }       from '../../events/define-event/define-event'
import { eventsOf }          from '../../events/events-of/events-of'
import type { Subscription } from '../../events/subscription/subscription'
import { UseCaseRunner }     from '../../use-case/use-case-runner/use-case-runner'
import { EventId }           from '../../value-objects/event-id/event-id'
import { isModule }          from '../is-module/is-module'
import { Module }            from './module'

const Placed = defineEvent('order.placed', z.object({ id: z.string(), total: z.number() }))

class Orders extends Module {
  readonly calls: unknown[][] = []
  constructor() {
    super('order', new UseCaseRunner())
  }

  async fulfil(id: string, eventId: string): Promise<void> {
    this.calls.push(['fulfil', id, eventId])
  }

  async purge(): Promise<void> {
    this.calls.push(['purge'])
  }
}

function recordingBus() {
  const subscriptions: { pattern: string, handler: EventHandler, options?: Subscription | undefined }[] = []
  const bus: EventBus = {
    publish: () => {},
    subscribe: (pattern, handler, options) => {
      subscriptions.push({ pattern, handler, ...(options ? { options } : {}) })
      return () => {}
    },
  }
  return { bus, subscriptions }
}

describe('on', () => {
  test('subscribes a handler on the queue its module, use case and event say, and calls the use case with what args make', async () => {
    const { bus, subscriptions } = recordingBus()
    const { placed } = eventsOf(bus, { placed: Placed })
    const orders = new Orders()

    orders.on(placed, 'fulfil', (order, { id }) => [order.id, id])

    expect(subscriptions.map(({ pattern, options }) => ({ pattern, options }))).toEqual([
      { pattern: 'order.placed', options: { strategy: 'handler', queue: 'order.fulfil.on.order.placed' } },
    ])
    await subscriptions[0]!.handler({ id: 'e1' as EventId, name: 'order.placed', payload: { id: 'o1', total: 5 }, occurredAt: '', actor: null })
    expect(orders.calls).toEqual([['fulfil', 'o1', 'e1']])
  })

  test('a use case that takes nothing needs no args', async () => {
    const { bus, subscriptions } = recordingBus()
    const { placed } = eventsOf(bus, { placed: Placed })
    const orders = new Orders()

    orders.on(placed, 'purge')
    await subscriptions[0]!.handler({ id: 'e1' as EventId, name: 'order.placed', payload: { id: 'o1', total: 5 }, occurredAt: '', actor: null })

    expect(orders.calls).toEqual([['purge']])
  })

  test('passes attempts and when on, and keeps a queue said by hand', () => {
    const { bus, subscriptions } = recordingBus()
    const { placed } = eventsOf(bus, { placed: Placed })
    const orders = new Orders()
    const when = (order: { total: number }) => order.total > 0

    orders.on(placed, 'fulfil', (order, { id }) => [order.id, id], { attempts: 10, when, queue: 'order.fulfilPlaced.on.order.placed' })

    expect(subscriptions[0]!.options).toEqual({ strategy: 'handler', queue: 'order.fulfilPlaced.on.order.placed', attempts: 10, when: when as NonNullable<Subscription['when']> })
  })

  test('a queue said by hand still ends with its event', () => {
    const { placed } = eventsOf(recordingBus().bus, { placed: Placed })

    expect(() => new Orders().on(placed, 'purge', undefined, { queue: 'order.purge.on.order.shipped' })).toThrow("A handler's queue is '<module>.<use case>.on.order.placed'")
  })
})

describe('a module', () => {
  test('registers itself in its context, with what it was given', () => {
    const runner = new UseCaseRunner({ context: 'shop' })
    class Stock extends Module {
      constructor() {
        super('stock', runner, { warehouse: 'main' })
      }
    }
    const stock = new Stock()

    expect(runner.registry.registeredModules).toEqual([expect.objectContaining({ instance: stock, className: 'Stock', deps: { warehouse: 'main' } })])
  })

  test('carries the brand of a module', () => {
    expect(isModule(new Orders())).toBe(true)
  })
})
