import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { ValidationError } from '../../../errors/validation-error/validation-error'
import { InvalidSort }     from './invalid-sort'

describe('InvalidSort', () => {
  test('is a validation error that says each issue and where', () => {
    const error = new InvalidSort([{ path: '0.field', message: 'Invalid option' }])

    expect(error).toBeInstanceOf(ValidationError)
    expect(error.code).toBe('invalid_sort')
    expect(error.message).toBe('The sort is not valid: 0.field: Invalid option')
  })
})
