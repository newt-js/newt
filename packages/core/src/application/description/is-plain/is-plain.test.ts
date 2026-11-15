import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { isPlain }  from './is-plain'

describe('isPlain', () => {
  test('takes an object literal and one without a prototype', () => {
    expect(isPlain({ a: 1 })).toBe(true)
    expect(isPlain(Object.create(null))).toBe(true)
  })

  test('leaves out null, primitives, arrays, maps and class instances', () => {
    class Thing {}
    expect(isPlain(null)).toBe(false)
    expect(isPlain('text')).toBe(false)
    expect(isPlain([1])).toBe(false)
    expect(isPlain(new Map())).toBe(false)
    expect(isPlain(new Thing())).toBe(false)
  })
})
