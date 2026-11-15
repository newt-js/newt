import { EventId } from '../../value-objects/event-id/event-id'

export type EventMeta = { id: EventId, name: string, occurredAt: string, actor: string | null, signal?: AbortSignal }
