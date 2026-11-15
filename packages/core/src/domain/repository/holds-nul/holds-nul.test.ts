import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { holdsNul } from './holds-nul'

describe('holdsNul', () => {
  test('finds NUL in text, however deep, keys of objects too', () => {
    expect(holdsNul('a\u0000b')).toBe(true)
    expect(holdsNul({ lines: [{ sku: 'x\u0000' }] })).toBe(true)
    expect(holdsNul({ ['k\u0000']: 1 })).toBe(true)
  })

  test('finds a lone surrogate the same way: no database keeps it as given', () => {
    expect(holdsNul('x\uD800')).toBe(true)
    expect(holdsNul('x\uDC00y')).toBe(true)
    expect(holdsNul({ lines: [{ sku: 'x\uD800' }] })).toBe(true)
    expect(holdsNul({ ['k\uDC00']: 1 })).toBe(true)
    expect(holdsNul('pair \uD83D\uDE00')).toBe(false)
  })

  test('finds none in what has none', () => {
    expect(holdsNul('plain')).toBe(false)
    expect(holdsNul({ lines: [1, true, null, 'x'] })).toBe(false)
    expect(holdsNul(new Uint8Array([0]))).toBe(false)
    expect(holdsNul(null)).toBe(false)
  })
})
