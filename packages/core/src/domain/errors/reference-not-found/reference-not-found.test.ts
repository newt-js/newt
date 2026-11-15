import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { test }              from 'bun:test'
// --------------------------------------------------------
import { ValidationError }   from '../validation-error/validation-error'
import { ReferenceNotFound } from './reference-not-found'

describe('ReferenceNotFound', () => {
  test('is a validation error that names what points nowhere', () => {
    const error = new ReferenceNotFound('city', 'c1')

    expect(error).toBeInstanceOf(ValidationError)
    expect(error.code).toBe('reference_not_found')
    expect(error.params).toEqual({ resource: 'city', id: 'c1' })
    expect(error.message).toBe('The city c1 does not exist')
  })
})
