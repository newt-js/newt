import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { unstorable } from './unstorable'

describe('unstorable', () => {
  test('text with NUL cannot be stored', () => {
    expect(unstorable('a\u0000b')).toBe(true)
  })

  test('text with a lone surrogate cannot be stored', () => {
    expect(unstorable('x\uD800')).toBe(true)
    expect(unstorable('x\uDC00y')).toBe(true)
  })

  test('plain text and whole surrogate pairs can', () => {
    expect(unstorable('plain')).toBe(false)
    expect(unstorable('pair 😀')).toBe(false)
    expect(unstorable('')).toBe(false)
  })
})
