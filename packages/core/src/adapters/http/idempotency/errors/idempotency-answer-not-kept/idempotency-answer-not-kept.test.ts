import { describe }                 from 'bun:test'
import { expect }                   from 'bun:test'
import { test }                     from 'bun:test'
// --------------------------------------------------------
import { IdempotencyAnswerNotKept } from './idempotency-answer-not-kept'

describe('IdempotencyAnswerNotKept', () => {
  test('is a conflict error that says why', () => {
    const error = new IdempotencyAnswerNotKept(200)

    expect([error.kind, error.code]).toEqual(['conflict', 'idempotency_answer_not_kept'])
    expect(error.message.length).toBeGreaterThan(0)
  })
})
