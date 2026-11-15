import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { DAY }        from './start-of-day'
import { startOfDay } from './start-of-day'

describe('startOfDay', () => {
  test('gives the midnight in UTC of the day a time is in', () => {
    expect(startOfDay(Date.parse('2026-01-02T17:45:12.000Z'))).toBe(Date.parse('2026-01-02T00:00:00.000Z'))
    expect(startOfDay(Date.parse('2026-01-02T00:00:00.000Z'))).toBe(Date.parse('2026-01-02T00:00:00.000Z'))
  })

  test('a day is 24 hours', () => {
    expect(DAY).toBe(86_400_000)
  })
})
