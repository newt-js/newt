import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
import { z }            from 'zod'
// --------------------------------------------------------
import { Clock }        from '../../clock/clock'
import { clockScope }   from '../../clock/clock-scope/clock-scope'
import { EventBus }     from '../bus/event-bus'
import { eventsOf }     from '../events-of/events-of'
import { InvalidEvent } from '../invalid-event/invalid-event'
import { defineEvent }  from './define-event'

const OrderPlaced = defineEvent('order.placed', z.object({ id: z.string(), total: z.number() }))

describe('defineEvent', () => {
  test('is a class of event, named, with its payload and when it happened, by the clock', () => {
    const clock: Clock = { now: () => new Date('2026-01-01T00:00:00.000Z') }
    const placed = clockScope.run(clock, () => new OrderPlaced({ id: 'o1', total: 10 }))

    expect(OrderPlaced.eventName).toBe('order.placed')
    expect(placed.name).toBe('order.placed')
    expect(placed.payload).toEqual({ id: 'o1', total: 10 })
    expect(placed.occurredAt).toBe('2026-01-01T00:00:00.000Z')
  })

  test('refuses a payload its schema does not take', () => {
    expect(() => new OrderPlaced({ id: 'o1', total: 'ten' } as never)).toThrow(InvalidEvent)
  })

  test('fits eventsOf, which types its emitter with the payload', () => {
    const bus: EventBus = { publish: () => {}, subscribe: () => () => {} }
    const { placed } = eventsOf(bus, { placed: OrderPlaced })

    placed.subscribe(order => order.total.toFixed(), { strategy: 'fire-and-forget' })
    // @ts-expect-error the payload has no `color`
    placed.subscribe(order => order.color, { strategy: 'fire-and-forget' })
    expect(placed.name).toBe('order.placed')
  })

  test('only takes a payload that is JSON', () => {
    // @ts-expect-error a Date would reach a handler as a string
    defineEvent('invoice.due', z.object({ dueAt: z.date() }))
  })

  test('only takes a schema that gives back what it takes, as a stored payload is read again', () => {
    // @ts-expect-error a transform takes a string and gives a number
    defineEvent('card.renamed', z.object({ words: z.string().transform(words => words.split(' ').length) }))
    // @ts-expect-error a default takes a payload without it
    defineEvent('card.sized', z.object({ size: z.number().default(1) }))
  })
})
