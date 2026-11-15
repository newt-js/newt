import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { captureLines } from '../../platform/capture-lines/capture-lines'
import { PollLoop }     from './poll-loop'

test('a pass that fails is logged, and the loop goes on at its next look', async () => {
  const { lines: logged, restore } = captureLines()
  let passes = 0
  const loop = new PollLoop(async () => {
    if (++passes === 1) {
      throw new Error('boom')
    }
  }, () => 1, '[Test] the pass failed')

  try {
    expect(loop.start()).toBe(true)
    expect(loop.start()).toBe(false)
    await Bun.sleep(20)
    await loop.stop()
  } finally {
    restore()
  }

  expect(logged[0]).toMatchObject({ level: 'error', message: '[Test] the pass failed', fields: { error: new Error('boom') } })
  expect(passes).toBeGreaterThan(1)
})

test('woken, it looks at once instead of waiting for its pause; stopped, it looks no more', async () => {
  let passes = 0
  const loop = new PollLoop(async () => void passes++, () => 60_000, '')

  loop.start()
  await Bun.sleep(5)
  loop.wake()
  await Bun.sleep(5)
  await loop.stop()
  const stopped = passes
  loop.wake()
  await Bun.sleep(5)

  expect(stopped).toBe(2)
  expect(passes).toBe(2)
})

test('started again while a stop still waits for its pass, it runs again at once, and the old loop ends after that pass', async () => {
  let passes = 0
  const slow = Promise.withResolvers<void>()
  const loop = new PollLoop(async () => {
    if (++passes === 1) {
      await slow.promise
    }
  }, () => 1, '')

  loop.start()
  const stopping = loop.stop()
  expect(loop.start()).toBe(true)
  await Bun.sleep(10)
  slow.resolve()
  await stopping
  const afterOld = passes
  await Bun.sleep(10)
  await loop.stop()

  expect(afterOld).toBeGreaterThan(1)
  expect(passes).toBeGreaterThan(afterOld)
})

test('stopped again after a restart, it waits for the pass the first stop waited for too', async () => {
  let inPass = 0
  const slow = Promise.withResolvers<void>()
  const loop = new PollLoop(async () => {
    inPass++
    try {
      if (inPass === 1) {
        await slow.promise
      }
    } finally {
      inPass--
    }
  }, () => 60_000, '')

  loop.start()
  void loop.stop()
  loop.start()
  await Bun.sleep(5)
  let stopped = false
  const stopping = loop.stop().then(() => {
    stopped = true
  })
  await Bun.sleep(5)
  const stoppedBeforeThePass = stopped
  slow.resolve()
  await stopping

  expect([stoppedBeforeThePass, inPass]).toEqual([false, 0])
})

test('tells whether it runs: from its start, and no more from the moment it is told to stop, before its pass ends', async () => {
  const slow = Promise.withResolvers<void>()
  const loop = new PollLoop(() => slow.promise, () => 1, '')

  expect(loop.running).toBe(false)
  loop.start()
  expect(loop.running).toBe(true)
  const stopping = loop.stop()
  expect(loop.running).toBe(false)
  slow.resolve()
  await stopping
  expect(loop.running).toBe(false)
})
