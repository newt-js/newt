import { ReactionRun } from './reaction-run'

export interface Inbox {
  /** Whether the reaction's event is in the inbox already: read outside any transaction, before its use case runs. */
  has(reaction: ReactionRun): Promise<boolean>
  /** Puts the reaction's event in the inbox, in the transaction it runs in: false if it was there already. */
  receive(reaction: ReactionRun): Promise<boolean>
  purge(before: string): Promise<void>
}
