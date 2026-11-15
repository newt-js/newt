import { describe }           from 'bun:test'
import { expect }             from 'bun:test'
import { test }               from 'bun:test'
// --------------------------------------------------------
import { EntityError }        from '../entity-error/entity-error'
import { EventWithoutChange } from './event-without-change'

describe('EventWithoutChange', () => {
  test('names the entity and the events it tells without a change', () => {
    const error = new EventWithoutChange('Card', 'c1', ['card.moved'])

    expect(error).toBeInstanceOf(EntityError)
    expect(error.message).toContain('Card c1 tells card.moved but has nothing to save')
  })
})
