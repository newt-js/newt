import { describe }           from 'bun:test'
import { expect }             from 'bun:test'
import { test }               from 'bun:test'
// --------------------------------------------------------
import { TransactionSpoiled } from './transaction-spoiled'

describe('TransactionSpoiled', () => {
  test('says why it rolled back, and keeps what the save threw', () => {
    const cause = new Error('conflict')
    const error = new TransactionSpoiled(cause)

    expect(error.message).toContain('a save that joined it failed')
    expect(error.cause).toBe(cause)
    expect(error.name).toBe('TransactionSpoiled')
  })
})
