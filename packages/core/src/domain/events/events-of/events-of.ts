import type { EventBus }         from '../bus/event-bus'
import { DomainEventEmitter }    from '../domain-event-emitter/domain-event-emitter'
import type { DomainEventClass } from '../event/domain-event-class'
import type { Json }             from '../event/json'

export type EmittersOf<Classes> = {
  readonly [K in keyof Classes]: Classes[K] extends DomainEventClass<infer Payload extends Json> ? DomainEventEmitter<Payload> : never
}

export function eventsOf<Classes extends Record<string, DomainEventClass<any>>>(bus: EventBus, classes: Classes): EmittersOf<Classes> {
  return Object.fromEntries(Object.entries(classes).map(([key, eventClass]) => [key, new DomainEventEmitter(bus, eventClass)])) as EmittersOf<Classes>
}
