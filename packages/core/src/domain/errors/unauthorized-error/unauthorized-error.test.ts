import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { test }              from 'bun:test'
// --------------------------------------------------------
import { ForbiddenError }    from '../forbidden-error/forbidden-error'
import { KnownError }        from '../known-error/known-error'
import { UnauthorizedError } from './unauthorized-error'

class Other extends ForbiddenError {
  readonly code = 'other'
}

class Example extends UnauthorizedError {
  readonly code = 'example'
}

describe('UnauthorizedError', () => {
  test('is a known error, told apart by its class', () => {
    const error = new Example('x')

    expect(error).toBeInstanceOf(KnownError)
    expect(error).toBeInstanceOf(UnauthorizedError)
  })

  test('is not taken for another category', () => {
    // @ts-expect-error a ForbiddenError is no UnauthorizedError
    const error: UnauthorizedError = new Other('x')

    expect(error).not.toBeInstanceOf(UnauthorizedError)
  })
})
