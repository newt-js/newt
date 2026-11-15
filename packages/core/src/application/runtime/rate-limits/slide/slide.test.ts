import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { slide }    from './slide'

const MINUTE = 60_000
const T0 = Date.parse('2026-01-01T10:00:00.000Z')
const rule = { limit: 10, windowMs: MINUTE }

describe('slide', () => {
  test('starts a key afresh in the window its first take is in', () => {
    expect(slide(null, rule, new Date(T0 + 5000))).toEqual({
      count: { start: T0, count: 1, previous: 0 },
      take: { allowed: true, limit: 10, remaining: 9, retryAfterMs: 0 },
    })
  })

  test('moves the window in progress to the one before when the next begins', () => {
    expect(slide({ start: T0, count: 4, previous: 7 }, rule, new Date(T0 + MINUTE)).count).toEqual({ start: T0 + MINUTE, count: 1, previous: 4 })
  })

  test('forgets both windows once a whole one went by without a take', () => {
    expect(slide({ start: T0, count: 10, previous: 10 }, rule, new Date(T0 + 2 * MINUTE)).count).toEqual({ start: T0 + 2 * MINUTE, count: 1, previous: 0 })
  })

  test('a full window by itself waits for the next, until enough of it has slid away', () => {
    const { take } = slide({ start: T0, count: 10, previous: 0 }, rule, new Date(T0 + 30_000))
    expect(take).toEqual({ allowed: false, limit: 10, remaining: 0, retryAfterMs: 30_000 + 6000 })
  })

  test('only the one before in the way waits until enough of it has slid away', () => {
    const { take } = slide({ start: T0, count: 5, previous: 10 }, rule, new Date(T0 + 24_000))
    expect(take).toEqual({ allowed: false, limit: 10, remaining: 0, retryAfterMs: 12_000 })
  })
})
