import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { isCondition } from './is-condition'

describe('isCondition', () => {
  test('is a plain object whose keys are all operators, an empty one too', () => {
    expect(isCondition({ gt: 1, lte: 5 })).toBe(true)
    expect(isCondition({})).toBe(true)
  })

  test('is not a value to equal: null, a list, an object of a class, or one with other keys', () => {
    expect(isCondition(null)).toBe(false)
    expect(isCondition([1])).toBe(false)
    expect(isCondition(new Date())).toBe(false)
    expect(isCondition({ gt: 1, name: 'a' })).toBe(false)
    expect(isCondition('a')).toBe(false)
  })
})
