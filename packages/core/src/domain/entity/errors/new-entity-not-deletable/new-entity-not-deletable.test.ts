import { describe }              from 'bun:test'
import { expect }                from 'bun:test'
import { test }                  from 'bun:test'
// --------------------------------------------------------
import { EntityError }           from '../entity-error/entity-error'
import { NewEntityNotDeletable } from './new-entity-not-deletable'

describe('NewEntityNotDeletable', () => {
  test('says one never saved cannot be deleted', () => {
    const error = new NewEntityNotDeletable()

    expect(error).toBeInstanceOf(EntityError)
    expect(error.message).toBe('Cannot delete an entity that was never persisted')
  })
})
