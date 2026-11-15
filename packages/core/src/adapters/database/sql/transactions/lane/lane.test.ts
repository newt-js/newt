import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { Lane }     from './lane'

const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

describe('Lane', () => {
  test('runs one thing at a time, in the order they came, each told its own result', async () => {
    const lane = new Lane()
    const order: string[] = []

    const results = await Promise.all([
      lane.exclusive(async () => {
        await pause(20)
        order.push('first')
        return 1
      }, 1_000),
      lane.exclusive(() => {
        order.push('second')
        return 2
      }, 1_000),
      lane.exclusive(() => Promise.reject(new Error('third failed')), 1_000).catch((error: Error) => error.message),
    ])

    expect(order).toEqual(['first', 'second'])
    expect(results).toEqual([1, 2, 'third failed'])
  })

  test('gives up on what waited too long, and skips it once its turn comes', async () => {
    const lane = new Lane()
    let ran = false
    const holding = lane.exclusive(() => pause(60), 1_000)

    await expect(lane.exclusive(() => {
      ran = true
    }, 20)).rejects.toThrow('Waited 20 ms for the database')
    await holding
    await lane.drain()

    expect(ran).toBe(false)
  })
})
