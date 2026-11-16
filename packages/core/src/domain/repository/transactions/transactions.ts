import type { GuardOptions }   from './guard-options'
import type { SaveInProgress } from './save-in-progress'

export interface Transactions {
  run<T>(fn: () => T | Promise<T>): Promise<T>
  save<T>(fn: (save: SaveInProgress) => Promise<T>): Promise<T>
  guard(keys: string[], options?: GuardOptions): Promise<void>
  afterRollback(fn: () => void): void
}
