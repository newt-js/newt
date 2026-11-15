import { describe }            from 'bun:test'
import { expect }              from 'bun:test'
import { test }                from 'bun:test'
// --------------------------------------------------------
import { ConflictError }       from '../conflict-error/conflict-error'
import { ConcurrencyConflict } from './concurrency-conflict'

class Example extends ConcurrencyConflict {
  readonly code = 'example'
}

describe('ConcurrencyConflict', () => {
  test('is a conflict', () => {
    const error = new Example('x')

    expect(error).toBeInstanceOf(ConflictError)
    expect(error.kind).toBe('conflict')
  })
})
