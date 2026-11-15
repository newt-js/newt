import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
import { z }            from 'zod'
// --------------------------------------------------------
import { optionalOnly } from './optional-only'

describe('optionalOnly', () => {
  test('is a field that may be left out, but not null', () => {
    expect(optionalOnly(z.string().optional())).toBe(true)
  })

  test('is not one that takes null, one that must be there, or none', () => {
    expect(optionalOnly(z.string().nullable())).toBe(false)
    expect(optionalOnly(z.string().nullish())).toBe(false)
    expect(optionalOnly(z.string())).toBe(false)
    expect(optionalOnly(undefined)).toBe(false)
  })
})
