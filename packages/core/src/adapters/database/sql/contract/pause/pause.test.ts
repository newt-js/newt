import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { pause }    from './pause'

describe('pause', () => {
  test('resolves after the time given', async () => {
    const started = performance.now()

    await pause(30)

    expect(performance.now() - started).toBeGreaterThanOrEqual(25)
  })

  // -----

  test('without a time, waits a short while', async () => {
    const started = performance.now()

    await pause()

    expect(performance.now() - started).toBeGreaterThanOrEqual(15)
  })
})
