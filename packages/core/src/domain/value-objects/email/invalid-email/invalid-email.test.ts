import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { ValidationError } from '../../../errors/validation-error/validation-error'
import { InvalidEmail }    from './invalid-email'

describe('InvalidEmail', () => {
  test('is a validation error that says what was wrong', () => {
    const error = new InvalidEmail(' Lucia ')

    expect(error).toBeInstanceOf(ValidationError)
    expect(error.code).toBe('invalid_email')
    expect(error.message).toBe("' Lucia ' is not a valid email")
    expect(error.params).toEqual({ email: ' Lucia ' })
  })
})
