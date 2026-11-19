import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { it }       from 'bun:test'
// --------------------------------------------------------
import { rank }     from './rank'

describe('rank', () => {
  it('puts packages first, by their path', () => {
    expect(rank('zod')).toEqual([0, 0, 'zod'])
    expect(rank('bun:test')).toEqual([0, 0, 'bun:test'])
  })

  it('puts local files after, the ones that climb more folders first', () => {
    expect(rank('./a')).toEqual([1, -0, './a'])
    expect(rank('../a')).toEqual([1, -1, '../a'])
    expect(rank('../../a/b')).toEqual([1, -2, '../../a/b'])
  })
})
