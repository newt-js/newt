import { AsyncLocalStorage }   from 'node:async_hooks'
// --------------------------------------------------------
import type { GuardOptions }   from '../../../../domain/repository/transactions/guard-options'
import type { SaveInProgress } from '../../../../domain/repository/transactions/save-in-progress'
import { TransactionSpoiled }  from '../../../../domain/repository/transactions/transaction-spoiled/transaction-spoiled'
import type { Transactions }   from '../../../../domain/repository/transactions/transactions'
import { runEach }             from '../run-each/run-each'

export type Staged = { apply(): void }

type Transaction = {
  open: boolean
  saves: Set<string>
  staged: Map<object, Staged>
  committed: (() => void)[]
  rolledBack: (() => void)[]
  spoiled?: { cause: unknown } | undefined
}

const ENDED = 'This call belongs to a transaction that has ended: it came after the transaction committed or rolled back (a call left unawaited, or a branch of a Promise.all still running when another threw). Await every call inside a transaction.'

export class MemoryTransactions implements Transactions {

  private readonly current = new AsyncLocalStorage<Transaction>()
  private readonly saving = new AsyncLocalStorage<SaveInProgress>()
  private queue: Promise<void> = Promise.resolve()

  get inTransaction(): boolean {
    return this.open !== undefined
  }

  run<T>(fn: () => T | Promise<T>): Promise<T> {
    return this.enter(fn, false)
  }

  save<T>(fn: (save: SaveInProgress) => Promise<T>): Promise<T> {
    return this.enter(() => {
      const save: SaveInProgress = { modules: this.open!.saves, read: new Set() }
      return this.saving.run(save, () => fn(save))
    }, true)
  }

  async guard(_keys: string[], _options?: GuardOptions): Promise<void> {
    this.assertNotEnded()
    if (!this.open) {
      throw new Error('A guard is taken inside a transaction')
    }
  }

  afterCommit(fn: () => void): void {
    this.assertNotEnded()
    const transaction = this.open
    if (transaction) {
      transaction.committed.push(fn)
    } else {
      fn()
    }
  }

  afterRollback(fn: () => void): void {
    this.open?.rolledBack.push(fn)
  }

  reading(records: string): void {
    this.saving.getStore()?.read.add(records)
  }

  assertNotEnded(): void {
    if (this.current.getStore()?.open === false) {
      throw new Error(ENDED)
    }
  }

  staged<S extends Staged>(owner: object, start: () => S): S | undefined {
    const transaction = this.open
    if (!transaction) {
      return undefined
    }
    let staged = transaction.staged.get(owner)
    if (!staged) {
      staged = start()
      transaction.staged.set(owner, staged)
    }
    return staged as S
  }

  private get open(): Transaction | undefined {
    const transaction = this.current.getStore()
    return transaction?.open ? transaction : undefined
  }

  private async enter<T>(fn: () => T | Promise<T>, allOrNone: boolean): Promise<T> {
    const joined = this.open
    if (joined) {
      if (!allOrNone) {
        return fn()
      }
      try {
        return await fn()
      } catch (error) {
        joined.spoiled ??= { cause: error }
        throw error
      }
    }
    this.assertNotEnded()
    const transaction: Transaction = { open: true, saves: new Set(), staged: new Map(), committed: [], rolledBack: [] }
    const result = await this.inTurn(async () => {
      let value: T
      try {
        value = await this.current.run(transaction, fn)
      } catch (error) {
        this.rollBack(transaction)
        throw error
      }
      if (transaction.spoiled) {
        this.rollBack(transaction)
        throw new TransactionSpoiled(transaction.spoiled.cause)
      }
      transaction.open = false
      for (const staged of transaction.staged.values()) {
        staged.apply()
      }
      return value
    })
    runEach(transaction.committed, 'a callback after a commit failed; the transaction is committed')
    return result
  }

  private inTurn<T>(fn: () => Promise<T>): Promise<T> {
    const turn = this.queue.then(fn)
    this.queue = turn.then(() => {}, () => {})
    return turn
  }

  private rollBack(transaction: Transaction): void {
    transaction.open = false
    runEach(transaction.rolledBack.reverse(), 'a callback after a rollback failed; the transaction is rolled back')
  }
}
