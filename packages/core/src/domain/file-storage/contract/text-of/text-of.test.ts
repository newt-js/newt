import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { textOf }   from './text-of'

describe('textOf', () => {
  test('decodes bytes as UTF-8', () => {
    expect(textOf(new TextEncoder().encode('hello ñ'))).toBe('hello ñ')
  })

  test('no bytes, no text', () => {
    expect(textOf(null)).toBeNull()
  })
})
