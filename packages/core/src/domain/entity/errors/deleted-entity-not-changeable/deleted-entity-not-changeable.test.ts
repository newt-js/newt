import { describe }                   from 'bun:test'
import { expect }                     from 'bun:test'
import { test }                       from 'bun:test'
// --------------------------------------------------------
import { EntityError }                from '../entity-error/entity-error'
import { DeletedEntityNotChangeable } from './deleted-entity-not-changeable'

describe('DeletedEntityNotChangeable', () => {
  test('says a deleted entity cannot change', () => {
    const error = new DeletedEntityNotChangeable()

    expect(error).toBeInstanceOf(EntityError)
    expect(error.message).toBe('Cannot change a deleted entity')
  })
})
