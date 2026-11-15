import { describe }           from 'bun:test'
import { expect }             from 'bun:test'
import { test }               from 'bun:test'
// --------------------------------------------------------
import { EntityError }        from '../entity-error/entity-error'
import { UnknownEntityField } from './unknown-entity-field'

describe('UnknownEntityField', () => {
  test('names the field, and why it cannot change when told', () => {
    expect(new UnknownEntityField('color')).toBeInstanceOf(EntityError)
    expect(new UnknownEntityField('color').message).toBe("Unknown field 'color' for this entity")
    expect(new UnknownEntityField('createdAt', 'the framework keeps it').message).toBe("Field 'createdAt' cannot be changed: the framework keeps it")
  })
})
