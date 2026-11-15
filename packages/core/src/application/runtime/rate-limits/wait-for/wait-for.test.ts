import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { waitFor }  from './wait-for'

const MINUTE = 60_000

describe('waitFor', () => {
  test('a full window by itself waits for the next, until enough of it has slid away', () => {
    expect(waitFor({ start: 0, count: 10, previous: 0 }, 10, MINUTE, 30_000)).toBe(36_000)
  })

  test('with the one before in the way, waits until enough of it has slid away', () => {
    expect(waitFor({ start: 0, count: 5, previous: 10 }, 10, MINUTE, 24_000)).toBe(12_000)
  })

  test('waits at least a millisecond', () => {
    expect(waitFor({ start: 0, count: 5, previous: 10 }, 10, MINUTE, MINUTE)).toBe(1)
  })
})
