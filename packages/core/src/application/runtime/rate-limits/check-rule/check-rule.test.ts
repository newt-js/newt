import { describe }  from 'bun:test'
import { expect }    from 'bun:test'
import { test }      from 'bun:test'
// --------------------------------------------------------
import { checkRule } from './check-rule'

describe('checkRule', () => {
  test('takes a whole limit and a whole window, each from 1', () => {
    expect(() => checkRule({ limit: 5, windowMs: 60_000 })).not.toThrow()
  })

  test('refuses any other', () => {
    expect(() => checkRule({ limit: 0, windowMs: 60_000 })).toThrow("A rate limit's limit is a whole number from 1: 0")
    expect(() => checkRule({ limit: 1.5, windowMs: 60_000 })).toThrow('limit')
    expect(() => checkRule({ limit: 5, windowMs: 0 })).toThrow("A rate limit's window is a whole number of milliseconds from 1: 0")
  })
})
