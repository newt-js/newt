import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
import { z }            from 'zod'
// --------------------------------------------------------
import { keepsUnnamed } from './keeps-unnamed'

const shape = { id: z.string(), createdAt: z.string(), updatedAt: z.string() }

describe('keepsUnnamed', () => {
  test('is a schema that keeps the fields it does not name', () => {
    expect(keepsUnnamed(z.looseObject(shape))).toBe(true)
    expect(keepsUnnamed(z.object(shape).catchall(z.string()))).toBe(true)
  })

  test('is not one that drops them or refuses them', () => {
    expect(keepsUnnamed(z.object(shape))).toBe(false)
    expect(keepsUnnamed(z.strictObject(shape))).toBe(false)
  })
})
