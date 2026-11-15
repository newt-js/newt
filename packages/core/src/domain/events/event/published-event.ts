import { EventId }     from '../../value-objects/event-id/event-id'
import { DomainEvent } from './domain-event'
import { Json }        from './json'

export type PublishedEvent<T extends Json = Json> = DomainEvent<T> & { id: EventId, actor: string | null }
