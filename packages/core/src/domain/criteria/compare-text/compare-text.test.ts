import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { compareText } from './compare-text'

describe('compareText', () => {
  test('by code point: upper case before lower case', () => {
    expect(compareText('B', 'a')).toBeLessThan(0)
    expect(compareText('a', 'b')).toBeLessThan(0)
    expect(compareText('z', 'é')).toBeLessThan(0)
  })

  test('a prefix comes first; the same text is equal', () => {
    expect(compareText('a', 'ab')).toBeLessThan(0)
    expect(compareText('ab', 'a')).toBeGreaterThan(0)
    expect(compareText('ab', 'ab')).toBe(0)
  })

  test('past U+FFFF sorts last, as UTF-8 bytes do', () => {
    expect(compareText('\u{1F600}', '～')).toBeGreaterThan(0)
    expect(compareText('～', '\u{1F600}')).toBeLessThan(0)
  })
})
