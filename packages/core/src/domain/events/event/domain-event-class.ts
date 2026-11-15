import { DomainEvent } from './domain-event'
import { Json }        from './json'

export type DomainEventClass<TPayload extends Json> = {
  readonly eventName: string
  new(payload: TPayload): DomainEvent<TPayload>
}
