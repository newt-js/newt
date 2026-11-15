import { DomainEvent } from '../events/event/domain-event'
import { SavedState }  from './saved-state'

export type RepositoryAccess<Fields> = {
  assertSavable(): void
  markPersisted(): void
  savedState(): SavedState
  restoreSaved(state: SavedState): void
  storedFields(): Fields
  takeEvents(): DomainEvent[]
}
