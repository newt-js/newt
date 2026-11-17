import { AsyncLocalStorage }   from 'node:async_hooks'
// --------------------------------------------------------
import type { SaveInProgress } from '../../../../../domain/repository/transactions/save-in-progress'
import { TransactionSpoiled }  from '../../../../../domain/repository/transactions/transaction-spoiled/transaction-spoiled'
import { endSteps }            from '../end-steps/end-steps'
import { Lane }                from '../lane/lane'
import { rollbackSteps }       from '../rollback-steps/rollback-steps'
import { runEach }             from '../run-each/run-each'

export type TransactionSteps = {
  begin(): void | Promise<void>
  commit(): void | Promise<void>
  rollback(): void | Promise<void>
  end?(): void | Promise<void>
}

type Transaction<State> = {
  open: boolean
  state: State
  saves: Set<string>
  committed: (() => void)[]
  rolledBack: (() => void)[]
  spoiled?: { cause: unknown } | undefined
}

const WAIT_TIMEOUT_MS = 30_000

const ENDED = 'This call belongs to a transaction that has ended: it came after the transaction committed or rolled back (a call left unawaited, or a branch of a Promise.all still running when another threw). Await every call inside a transaction.'

export class TransactionScope<State> {

  private readonly current = new AsyncLocalStorage<Transaction<State>>()
  private readonly saving = new AsyncLocalStorage<SaveInProgress>()

  constructor(
    private readonly serial: boolean,
    private readonly waitTimeoutMs = WAIT_TIMEOUT_MS,
    private readonly lane = new Lane(),
  ) {}

  get state(): State | undefined {
    const transaction = this.current.getStore()
    return transaction?.open ? transaction.state : undefined
  }

  get inTransaction(): boolean {
    return this.current.getStore()?.open === true
  }

  assertNotEnded(): void {
    if (this.current.getStore()?.open === false) {
      throw new Error(ENDED)
    }
  }

  reading(table: string): void {
    this.saving.getStore()?.read.add(table)
  }

  run<T>(fn: () => T | Promise<T>, start: () => { state: State, steps: TransactionSteps }): Promise<T> {
    return this.enter(() => fn(), false, start)
  }

  save<T>(fn: (save: SaveInProgress) => Promise<T>, start: () => { state: State, steps: TransactionSteps }): Promise<T> {
    return this.enter(transaction => {
      const save: SaveInProgress = { modules: transaction.saves, read: new Set() }
      return this.saving.run(save, () => fn(save))
    }, true, start)
  }

  afterCommit(fn: () => void): void {
    this.assertNotEnded()
    const transaction = this.current.getStore()
    if (transaction?.open) {
      transaction.committed.push(fn)
    } else {
      fn()
    }
  }

  afterRollback(fn: () => void): void {
    const transaction = this.current.getStore()
    if (transaction?.open) {
      transaction.rolledBack.push(fn)
    }
  }

  exclusive<T>(fn: () => T | Promise<T>): Promise<T> {
    return this.lane.exclusive(fn, this.waitTimeoutMs)
  }

  drain(): Promise<void> {
    return this.lane.drain()
  }

  private async enter<T>(fn: (transaction: Transaction<State>) => T | Promise<T>, allOrNone: boolean, start: () => { state: State, steps: TransactionSteps }): Promise<T> {
    const joined = this.current.getStore()
    if (joined?.open) {
      if (!allOrNone) {
        return fn(joined)
      }
      try {
        return await fn(joined)
      } catch (error) {
        joined.spoiled ??= { cause: error }
        throw error
      }
    }
    this.assertNotEnded()
    const body = async () => {
      const { state, steps } = start()
      const transaction: Transaction<State> = { open: true, state, saves: new Set(), committed: [], rolledBack: [] }
      let committed = false
      try {
        const value = await this.inside(transaction, steps, fn)
        committed = true
        return { value, transaction }
      } catch (error) {
        if (!committed) {
          runEach(transaction.rolledBack.reverse(), 'a callback after a rollback failed; the transaction is rolled back')
        }
        throw error
      }
    }
    const { value, transaction } = this.serial ? await this.exclusive(body) : await body()
    runEach(transaction.committed, 'a callback after a commit failed; the transaction is committed')
    return value
  }

  private async inside<T>(transaction: Transaction<State>, steps: TransactionSteps, fn: (transaction: Transaction<State>) => T | Promise<T>): Promise<T> {
    await steps.begin()
    try {
      let value: T
      try {
        value = await this.current.run(transaction, () => fn(transaction))
      } catch (error) {
        transaction.open = false
        await rollbackSteps(steps)
        throw error
      }
      transaction.open = false
      if (transaction.spoiled) {
        await rollbackSteps(steps)
        throw new TransactionSpoiled(transaction.spoiled.cause)
      }
      try {
        await steps.commit()
      } catch (error) {
        await rollbackSteps(steps)
        throw error
      }
      return value
    } finally {
      await endSteps(steps)
    }
  }
}
