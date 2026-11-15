import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { endOf }    from './end-of'

describe('endOf', () => {
  test('gives the position just past the first close found from where it starts', () => {
    expect(endOf('a */ b */', '*/', 0)).toBe(4)
    expect(endOf('a */ b */', '*/', 4)).toBe(9)
  })

  test('without a close, runs to the end of the text', () => {
    expect(endOf('-- a comment', '\n', 2)).toBe(12)
  })
})
