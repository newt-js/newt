import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { pause }    from './pause'

describe('pause', () => {
  test('waits 10 ms unless told', async () => {
    const start = performance.now()
    await pause()
    expect(performance.now() - start).toBeGreaterThanOrEqual(8)
  })

  test('waits as long as told', async () => {
    const start = performance.now()
    await pause(30)
    expect(performance.now() - start).toBeGreaterThanOrEqual(25)
  })
})
