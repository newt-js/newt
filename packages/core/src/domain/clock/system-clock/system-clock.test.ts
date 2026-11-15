import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { systemClock } from './system-clock'

describe('systemClock', () => {
  test('is the real time', () => {
    const before = Date.now()
    const time = systemClock.now().getTime()

    expect(time).toBeGreaterThanOrEqual(before)
    expect(time).toBeLessThanOrEqual(Date.now())
  })
})
