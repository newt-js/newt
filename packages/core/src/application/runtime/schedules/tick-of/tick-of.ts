import type { Clock }            from '../../../../domain/clock/clock'
import type { DomainEvent }      from '../../../../domain/events/event/domain-event'
import type { DomainEventClass } from '../../../../domain/events/event/domain-event-class'
import type { ScheduleTick }     from '../schedule-tick'

export function tickOf(name: string, clock: Clock): DomainEventClass<ScheduleTick> {
  return class implements DomainEvent<ScheduleTick> {
    static readonly eventName = name
    readonly name = name
    readonly occurredAt = clock.now().toISOString()
    constructor(readonly payload: ScheduleTick) {}
  }
}
