import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { exactIntegers } from './exact-integers'

describe('exactIntegers', () => {
  test('gives a whole number a double holds as a number, a bigger one as its exact digits, and leaves the rest as it was', () => {
    expect(exactIntegers([{ small: 42n, edge: 9_007_199_254_740_991n, big: 9_223_372_036_854_775_807n, low: -9_007_199_254_740_993n, text: 'a', real: 1.5, none: null }])).toEqual([
      { small: 42, edge: 9_007_199_254_740_991, big: '9223372036854775807', low: '-9007199254740993', text: 'a', real: 1.5, none: null },
    ])
  })
})
