import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { passes }   from './passes'

describe('passes', () => {
  test('eq, ne and in by identity', () => {
    expect(passes('a', { eq: 'a' })).toBe(true)
    expect(passes('a', { ne: 'a' })).toBe(false)
    expect(passes(2, { in: [1, 2] })).toBe(true)
    expect(passes(3, { in: [1, 2] })).toBe(false)
  })

  test('ranges compare the value, never null', () => {
    expect(passes(5, { gt: 4, lte: 5 })).toBe(true)
    expect(passes(5, { gte: 6 })).toBe(false)
    expect(passes(5, { lt: 5 })).toBe(false)
    expect(passes(null, { lt: 5 })).toBe(false)
    expect(passes(5, { gt: null })).toBe(false)
  })

  test('ieq ignores ASCII case, only on text', () => {
    expect(passes('Hello', { ieq: 'hELLO' })).toBe(true)
    expect(passes('Ñ', { ieq: 'ñ' })).toBe(false)
    expect(passes(1, { ieq: 1 })).toBe(false)
  })

  test('every operator must pass; none passes all', () => {
    expect(passes(5, { gt: 1, ne: 5 })).toBe(false)
    expect(passes(5, {})).toBe(true)
  })
})
