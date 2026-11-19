import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { it }       from 'bun:test'
// --------------------------------------------------------
import { byText }   from './by-text'

describe('byText', () => {
  it('orders texts by their code points, not by locale', () => {
    expect(byText('a', 'b')).toBe(-1)
    expect(byText('b', 'a')).toBe(1)
    expect(byText('a', 'a')).toBe(0)
    expect(byText('Z', 'a')).toBe(-1)
  })
})
