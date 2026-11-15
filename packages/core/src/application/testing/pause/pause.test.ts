import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { pause }    from './pause'

describe('pause', () => {
  test('resolves once the time given has gone by', async () => {
    const before = performance.now()

    await pause(20)

    expect(performance.now() - before).toBeGreaterThanOrEqual(19)
  })
})
