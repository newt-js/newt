import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { KnownError }      from '../known-error/known-error'
import { ValidationError } from '../validation-error/validation-error'
import { ConflictError }   from './conflict-error'

class Other extends ValidationError {
  readonly code = 'other'
}

class Example extends ConflictError {
  readonly code = 'example'
}

describe('ConflictError', () => {
  test('is a known error, told apart by its class', () => {
    const error = new Example('x')

    expect(error).toBeInstanceOf(KnownError)
    expect(error).toBeInstanceOf(ConflictError)
  })

  test('is not taken for another category', () => {
    // @ts-expect-error a ValidationError is no ConflictError
    const error: ConflictError = new Other('x')

    expect(error).not.toBeInstanceOf(ConflictError)
  })
})
