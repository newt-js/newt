import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { ValidationError } from '../../../errors/validation-error/validation-error'
import { InvalidUuid }     from './invalid-uuid'

describe('InvalidUuid', () => {
  test('is a validation error that says what was wrong', () => {
    const error = new InvalidUuid('BoardId')

    expect(error).toBeInstanceOf(ValidationError)
    expect(error.code).toBe('invalid_uuid')
    expect(error.message).toBe('That is not a valid BoardId')
    expect(error.params).toEqual({ type: 'BoardId' })
  })
})
