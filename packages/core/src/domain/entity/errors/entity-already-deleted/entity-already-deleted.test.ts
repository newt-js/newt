import { describe }             from 'bun:test'
import { expect }               from 'bun:test'
import { test }                 from 'bun:test'
// --------------------------------------------------------
import { EntityError }          from '../entity-error/entity-error'
import { EntityAlreadyDeleted } from './entity-already-deleted'

describe('EntityAlreadyDeleted', () => {
  test('says it was deleted already', () => {
    const error = new EntityAlreadyDeleted()

    expect(error).toBeInstanceOf(EntityError)
    expect(error.message).toBe('Entity is already deleted')
  })
})
