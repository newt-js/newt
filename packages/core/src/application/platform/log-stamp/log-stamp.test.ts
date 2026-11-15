import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { Clock }      from '../../../domain/clock/clock'
import { clockScope } from '../../../domain/clock/clock-scope/clock-scope'
import { logStamp }   from './log-stamp'

describe('logStamp', () => {
  test('stamps by the clock in scope', () => {
    const clock: Clock = { now: () => new Date('2026-01-01T00:00:00.000Z') }

    expect(clockScope.run(clock, () => logStamp())).toBe('2026-01-01T00:00:00.000Z')
  })

  test('stamps by the real time when the clock throws or gives no valid date', () => {
    const before = Date.now()
    const throwing: Clock = { now: () => {
      throw new Error('no time')
    } }
    const invalid: Clock = { now: () => new Date(NaN) }

    expect(Date.parse(clockScope.run(throwing, () => logStamp()))).toBeGreaterThanOrEqual(before)
    expect(Date.parse(clockScope.run(invalid, () => logStamp()))).toBeGreaterThanOrEqual(before)
  })
})
