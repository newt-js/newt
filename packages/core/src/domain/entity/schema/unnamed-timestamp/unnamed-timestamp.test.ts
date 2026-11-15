import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
import { z }                from 'zod'
// --------------------------------------------------------
import { EntitySchema }     from '../../entity-schema'
import { unnamedTimestamp } from './unnamed-timestamp'

describe('unnamedTimestamp', () => {
  test('is the first timestamp the schema does not name', () => {
    expect(unnamedTimestamp(z.object({ id: z.string(), updatedAt: z.string() }) as unknown as EntitySchema)).toBe('createdAt')
  })

  test('is none when it names both', () => {
    expect(unnamedTimestamp(z.object({ id: z.string(), createdAt: z.string(), updatedAt: z.string() }))).toBeUndefined()
  })
})
