import type { DomainEvent } from '../event/domain-event'

export interface EventPublisher {
  publish(event: DomainEvent): void | Promise<void>
}
