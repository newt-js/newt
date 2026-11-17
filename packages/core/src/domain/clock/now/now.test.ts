import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import type { Clock } from '../clock'
import { clockScope } from '../clock-scope/clock-scope'
import { now }        from './now'

function testClock(at: string) {
  let time = Date.parse(at)
  const clock: Clock = { now: () => new Date(time) }
  return { clock, move: (ms: number) => {
    time += ms
  } }
}

describe('now', () => {
  test('is the real time outside any clock', () => {
    const before = Date.now()
    const time = now().getTime()

    expect(time).toBeGreaterThanOrEqual(before)
    expect(time).toBeLessThanOrEqual(Date.now())
  })

  test('is the time of the clock the work in progress runs by', () => {
    const { clock, move } = testClock('2026-01-01T00:00:00.000Z')

    const seen = clockScope.run(clock, () => {
      const first = now().toISOString()
      move(60_000)
      return [first, now().toISOString()]
    })

    expect(seen).toEqual(['2026-01-01T00:00:00.000Z', '2026-01-01T00:01:00.000Z'])
  })
})
