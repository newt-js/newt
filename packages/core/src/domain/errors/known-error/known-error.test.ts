import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { KnownError } from './known-error'

class ThingNotFound extends KnownError {
  readonly kind = 'not_found'
  readonly code = 'thing.not_found'
}

describe('KnownError', () => {
  test('is an Error named after the concrete class, keeping its message, kind, code and params', () => {
    const error = new ThingNotFound('Thing 1 not found')

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('ThingNotFound')
    expect(error.message).toBe('Thing 1 not found')
    expect(error.kind).toBe('not_found')
    expect(error.params).toEqual({})
    expect(error.code).toBe('thing.not_found')
  })
})
