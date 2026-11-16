import { EventId }          from '../../value-objects/event-id/event-id'
import type { DomainEvent } from './domain-event'
import type { Json }        from './json'

export type PublishedEvent<T extends Json = Json> = DomainEvent<T> & { id: EventId, actor: string | null }
