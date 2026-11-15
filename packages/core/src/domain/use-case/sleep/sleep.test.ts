import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { sleep }    from './sleep'

describe('sleep', () => {
  test('resolves once the time has passed', async () => {
    const start = performance.now()
    await sleep(20)
    expect(performance.now() - start).toBeGreaterThanOrEqual(15)
  })

  test('resolves at once for no time', async () => {
    expect(await sleep(0)).toBeUndefined()
  })
})
