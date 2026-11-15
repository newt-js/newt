import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { test }              from 'bun:test'
// --------------------------------------------------------
import { ValidationError }   from '../../../errors/validation-error/validation-error'
import { InvalidSearchText } from './invalid-search-text'

describe('InvalidSearchText', () => {
  test('is a validation error that says what was wrong', () => {
    const error = new InvalidSearchText(100)

    expect(error).toBeInstanceOf(ValidationError)
    expect(error.code).toBe('invalid_search_text')
    expect(error.message).toBe('A search takes at most 100 characters')
    expect(error.params).toEqual({ max: 100 })
  })
})
