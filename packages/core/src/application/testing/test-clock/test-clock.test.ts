import { describe }  from 'bun:test'
import { expect }    from 'bun:test'
import { test }      from 'bun:test'
// --------------------------------------------------------
import { TestClock } from './test-clock'

describe('TestClock', () => {
  test('stands still at the start of 2026 unless told, until it is set or advanced', () => {
    const clock = new TestClock()

    expect(clock.now().toISOString()).toBe('2026-01-01T00:00:00.000Z')
    clock.advance(1500)
    expect(clock.now().toISOString()).toBe('2026-01-01T00:00:01.500Z')
    clock.set('2026-06-01T10:00:00.000Z')
    expect(clock.now().toISOString()).toBe('2026-06-01T10:00:00.000Z')
  })

  test('starts where it is told', () => {
    expect(new TestClock(new Date('2030-02-03T04:05:06.000Z')).now().toISOString()).toBe('2030-02-03T04:05:06.000Z')
  })

  test('gives a new date each time: one changed outside does not move it', () => {
    const clock = new TestClock()
    clock.now().setFullYear(1999)

    expect(clock.now().getUTCFullYear()).toBe(2026)
  })
})
