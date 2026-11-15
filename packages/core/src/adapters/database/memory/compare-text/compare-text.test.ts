import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { compareText } from './compare-text'

describe('compareText', () => {
  test('orders two texts by their code units, and gives zero for the same text', () => {
    expect(compareText('a', 'b')).toBe(-1)
    expect(compareText('b', 'a')).toBe(1)
    expect(compareText('a', 'a')).toBe(0)
    expect(compareText('Z', 'a')).toBe(-1)
  })
})
