import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { ValidationError } from '../../../errors/validation-error/validation-error'
import { InvalidKey }      from './invalid-key'

describe('InvalidKey', () => {
  test('is a validation error that says what was wrong', () => {
    const error = new InvalidKey('BoardId')

    expect(error).toBeInstanceOf(ValidationError)
    expect(error.code).toBe('invalid_key')
    expect(error.message).toBe('That is not a valid BoardId')
    expect(error.params).toEqual({ type: 'BoardId' })
  })
})
