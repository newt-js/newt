import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
// --------------------------------------------------------
import { EventId }          from '../../value-objects/event-id/event-id'
import type { EventBus }    from '../bus/event-bus'
import type { DomainEvent } from '../event/domain-event'
import { eventsOf }         from './events-of'

class Placed implements DomainEvent<{ id: string }> {
  static readonly eventName = 'order.placed'
  readonly id = 'e1' as EventId
  readonly name = Placed.eventName
  readonly occurredAt = ''
  constructor(readonly payload: { id: string }) {}
}

class Confirmed implements DomainEvent<{ id: string }> {
  static readonly eventName = 'order.confirmed'
  readonly id = 'e2' as EventId
  readonly name = Confirmed.eventName
  readonly occurredAt = ''
  constructor(readonly payload: { id: string }) {}
}

describe('eventsOf', () => {
  test('gives each event its own emitter, named after it', () => {
    const patterns: string[] = []
    const bus: EventBus = {
      publish: () => {},
      subscribe: pattern => {
        patterns.push(pattern)
        return () => {}
      },
    }
    const events = eventsOf(bus, { placed: Placed, confirmed: Confirmed })

    events.placed.subscribe(() => {}, { strategy: 'fire-and-forget' })
    events.confirmed.subscribe(() => {}, { strategy: 'fire-and-forget' })

    expect([events.placed.name, events.confirmed.name]).toEqual(['order.placed', 'order.confirmed'])
    expect(patterns).toEqual(['order.placed', 'order.confirmed'])
  })
})
