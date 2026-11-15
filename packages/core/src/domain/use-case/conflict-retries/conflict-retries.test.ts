import { describe }                 from 'bun:test'
import { expect }                   from 'bun:test'
import { test }                     from 'bun:test'
// --------------------------------------------------------
import { DEFAULT_CONFLICT_RETRIES } from './conflict-retries'
import { conflictRetries }          from './conflict-retries'

describe('conflictRetries', () => {
  test('are three more by default, one of them after a value taken, waiting 10 ms at most', () => {
    expect(conflictRetries(undefined)).toEqual({ times: 3, duplicates: 1, backoffMs: 10 })
    expect(DEFAULT_CONFLICT_RETRIES).toEqual(conflictRetries({}))
  })

  test('take what they are given, the defaults for the rest', () => {
    expect(conflictRetries({ times: 6 })).toEqual({ times: 6, duplicates: 1, backoffMs: 10 })
    expect(conflictRetries({ times: undefined } as never)).toEqual(DEFAULT_CONFLICT_RETRIES)
  })

  test('without duplicates given, never more of them than times', () => {
    expect(conflictRetries({ times: 0 })).toEqual({ times: 0, duplicates: 0, backoffMs: 10 })
  })

  test('refuse what is no whole number from 0, duplicates past times, or a wait that is no number from 0', () => {
    expect(() => conflictRetries({ times: -1 })).toThrow('conflictRetries.times is a whole number from 0, not -1')
    expect(() => conflictRetries({ duplicates: 1.5 })).toThrow('conflictRetries.duplicates is a whole number from 0, not 1.5')
    expect(() => conflictRetries({ times: 1, duplicates: 2 })).toThrow('conflictRetries.duplicates are among its times, no more than 1, not 2')
    expect(() => conflictRetries({ backoffMs: Number.NaN })).toThrow('conflictRetries.backoffMs is a number of milliseconds from 0, not NaN')
  })
})
