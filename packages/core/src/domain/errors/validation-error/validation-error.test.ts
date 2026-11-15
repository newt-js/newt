import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { KnownError }      from '../known-error/known-error'
import { NotFoundError }   from '../not-found-error/not-found-error'
import { ValidationError } from './validation-error'

class Other extends NotFoundError {
  readonly code = 'other'
}

class Example extends ValidationError {
  readonly code = 'example'
}

describe('ValidationError', () => {
  test('is a known error, told apart by its class', () => {
    const error = new Example('x')

    expect(error).toBeInstanceOf(KnownError)
    expect(error).toBeInstanceOf(ValidationError)
  })

  test('is not taken for another category', () => {
    // @ts-expect-error a NotFoundError is no ValidationError
    const error: ValidationError = new Other('x')

    expect(error).not.toBeInstanceOf(ValidationError)
  })
})
