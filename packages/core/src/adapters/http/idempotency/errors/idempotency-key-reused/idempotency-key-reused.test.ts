import { describe }             from 'bun:test'
import { expect }               from 'bun:test'
import { test }                 from 'bun:test'
// --------------------------------------------------------
import { IdempotencyKeyReused } from './idempotency-key-reused'

describe('IdempotencyKeyReused', () => {
  test('is a unprocessable error that says why', () => {
    const error = new IdempotencyKeyReused()

    expect([error.kind, error.code]).toEqual(['unprocessable', 'idempotency_key_reused'])
    expect(error.message.length).toBeGreaterThan(0)
  })
})
