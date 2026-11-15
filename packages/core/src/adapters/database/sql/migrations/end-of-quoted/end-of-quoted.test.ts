import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { endOfQuoted } from './end-of-quoted'

describe('endOfQuoted', () => {
  test('ends just past the closing quote', () => {
    expect(endOfQuoted("'a;b' c", "'", 1, false)).toBe(5)
  })

  test('a doubled quote is a quote inside the text, not its end', () => {
    expect(endOfQuoted("'it''s' c", "'", 1, false)).toBe(7)
  })

  test('with escapes, a backslash keeps the next quote inside', () => {
    expect(endOfQuoted("'a\\'b' c", "'", 1, true)).toBe(6)
  })

  test('without escapes, a backslash is a character like any other', () => {
    expect(endOfQuoted("'a\\'b' c", "'", 1, false)).toBe(4)
  })

  test('a quote left open runs to the end of the text', () => {
    expect(endOfQuoted("'never closed", "'", 1, false)).toBe(13)
  })
})
