import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
// --------------------------------------------------------
import { EntityError }    from '../entity-error/entity-error'
import { SaveRolledBack } from './save-rolled-back'

describe('SaveRolledBack', () => {
  test('says which entity to read again', () => {
    const error = new SaveRolledBack('Card', 'c1')

    expect(error).toBeInstanceOf(EntityError)
    expect(error.message).toBe('Card c1 was in a save that rolled back: read it again, and save that one')
  })
})
