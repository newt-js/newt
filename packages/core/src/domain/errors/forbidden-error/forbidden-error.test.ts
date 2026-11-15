import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { test }              from 'bun:test'
// --------------------------------------------------------
import { KnownError }        from '../known-error/known-error'
import { UnauthorizedError } from '../unauthorized-error/unauthorized-error'
import { ForbiddenError }    from './forbidden-error'

class Other extends UnauthorizedError {
  readonly code = 'other'
}

class Example extends ForbiddenError {
  readonly code = 'example'
}

describe('ForbiddenError', () => {
  test('is a known error, told apart by its class', () => {
    const error = new Example('x')

    expect(error).toBeInstanceOf(KnownError)
    expect(error).toBeInstanceOf(ForbiddenError)
  })

  test('is not taken for another category', () => {
    // @ts-expect-error a UnauthorizedError is no ForbiddenError
    const error: ForbiddenError = new Other('x')

    expect(error).not.toBeInstanceOf(ForbiddenError)
  })
})
