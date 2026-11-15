import { describe }            from 'bun:test'
import { expect }              from 'bun:test'
import { test }                from 'bun:test'
// --------------------------------------------------------
import { ConcurrencyConflict } from '../../../../../domain/errors/concurrency-conflict/concurrency-conflict'
import { TransactionConflict } from './transaction-conflict'

describe('TransactionConflict', () => {
  test('is a conflict a use case runs again, keeping what the database said', () => {
    const cause = new Error('deadlock detected')
    const conflict = new TransactionConflict(cause)

    expect(conflict).toBeInstanceOf(ConcurrencyConflict)
    expect(conflict.kind).toBe('conflict')
    expect(conflict.code).toBe('transaction_conflict')
    expect(conflict.cause).toBe(cause)
  })
})
