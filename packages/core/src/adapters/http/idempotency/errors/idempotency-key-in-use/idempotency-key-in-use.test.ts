import { describe }            from 'bun:test'
import { expect }              from 'bun:test'
import { test }                from 'bun:test'
// --------------------------------------------------------
import { IdempotencyKeyInUse } from './idempotency-key-in-use'

describe('IdempotencyKeyInUse', () => {
  test('is a conflict error that says why', () => {
    const error = new IdempotencyKeyInUse()

    expect([error.kind, error.code]).toEqual(['conflict', 'idempotency_key_in_use'])
    expect(error.message.length).toBeGreaterThan(0)
  })
})
