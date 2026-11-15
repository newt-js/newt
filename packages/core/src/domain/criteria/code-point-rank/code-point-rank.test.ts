import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { codePointRank } from './code-point-rank'

describe('codePointRank', () => {
  test('below the surrogates, a unit ranks as itself', () => {
    expect(codePointRank(0x41)).toBe(0x41)
    expect(codePointRank(0xd7ff)).toBe(0xd7ff)
  })

  test('surrogates rank after every other unit, as code points past U+FFFF do', () => {
    expect(codePointRank(0xd800)).toBeGreaterThan(codePointRank(0xffff))
    expect(codePointRank(0xdfff)).toBeGreaterThan(codePointRank(0xffff))
  })

  test('U+E000 to U+FFFF rank right after U+D7FF', () => {
    expect(codePointRank(0xe000)).toBe(0xd800)
    expect(codePointRank(0xff5e)).toBeLessThan(codePointRank(0xd83d))
  })
})
