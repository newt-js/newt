import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { pause }    from './pause'

describe('pause', () => {
  test('resolves once the time given has passed', async () => {
    const started = performance.now()
    await pause(20)
    expect(performance.now() - started).toBeGreaterThanOrEqual(15)
  })
})
