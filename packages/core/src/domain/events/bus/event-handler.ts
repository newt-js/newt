import type { PublishedEvent } from '../event/published-event'

export type EventHandler = (event: PublishedEvent, signal?: AbortSignal) => void | Promise<void>
