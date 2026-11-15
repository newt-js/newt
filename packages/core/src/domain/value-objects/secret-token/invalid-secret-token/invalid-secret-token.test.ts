import { describe }           from 'bun:test'
import { expect }             from 'bun:test'
import { test }               from 'bun:test'
// --------------------------------------------------------
import { ValidationError }    from '../../../errors/validation-error/validation-error'
import { InvalidSecretToken } from './invalid-secret-token'

describe('InvalidSecretToken', () => {
  test('is a validation error that says what was wrong', () => {
    const error = new InvalidSecretToken()

    expect(error).toBeInstanceOf(ValidationError)
    expect(error.code).toBe('invalid_secret_token')
    expect(error.message).toBe('The token is not valid')
    expect(error.params).toEqual({})
  })
})
