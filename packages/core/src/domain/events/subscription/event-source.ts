import { DomainEventEmitter } from '../domain-event-emitter/domain-event-emitter'
import { Json }               from '../event/json'

export type EventSource<TPayload extends Json> = Pick<DomainEventEmitter<TPayload>, 'subscribe'>
