import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
import { z }             from 'zod'
// --------------------------------------------------------
import { EntityError }   from '../entity-error/entity-error'
import { InvalidEntity } from './invalid-entity'

describe('InvalidEntity', () => {
  test('names each field that fails, and keeps zod error as its cause', () => {
    const parsed = z.object({ title: z.string(), tags: z.array(z.string()) }).safeParse({ title: 1, tags: [2] })
    const error = new InvalidEntity('Card', 'c1', parsed.error!)

    expect(error).toBeInstanceOf(EntityError)
    expect(error.message).toStartWith('Card c1 does not pass its schema: title: ')
    expect(error.message).toContain('; tags.0: ')
    expect(error.cause).toBe(parsed.error)
  })
})
