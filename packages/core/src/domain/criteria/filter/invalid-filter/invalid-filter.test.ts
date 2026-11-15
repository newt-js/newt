import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { ValidationError } from '../../../errors/validation-error/validation-error'
import { InvalidFilter }   from './invalid-filter'

describe('InvalidFilter', () => {
  test('is a validation error that says each issue and where', () => {
    const error = new InvalidFilter([{ path: 'or.0.value', message: 'Expected number' }, { path: '', message: 'A filter has at most 3 conditions' }])

    expect(error).toBeInstanceOf(ValidationError)
    expect(error.code).toBe('invalid_filter')
    expect(error.message).toBe('The filter is not valid: or.0.value: Expected number; A filter has at most 3 conditions')
    expect(error.params.issues).toHaveLength(2)
  })
})
