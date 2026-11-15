import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { allOf }    from './all-of'

describe('allOf', () => {
  test('asks both at once', () => {
    expect(allOf<{ a: number, b: number }>({ a: 1 }, { b: { gt: 2 } })).toEqual({ and: [{ a: 1 }, { b: { gt: 2 } }] })
  })
})
