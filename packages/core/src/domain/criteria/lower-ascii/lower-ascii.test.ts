import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { lowerAscii } from './lower-ascii'

describe('lowerAscii', () => {
  test('lowers A to Z', () => {
    expect(lowerAscii('Hello WORLD')).toBe('hello world')
  })

  test('leaves letters past ASCII as they are, as SQL does', () => {
    expect(lowerAscii('ÁÉÑ')).toBe('ÁÉÑ')
    expect(lowerAscii('Ñandú')).toBe('Ñandú')
  })
})
