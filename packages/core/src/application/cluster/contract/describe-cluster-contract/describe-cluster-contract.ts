import { afterEach }           from 'bun:test'
import { beforeEach }          from 'bun:test'
import { describe }            from 'bun:test'
import { expect }              from 'bun:test'
import { test }                from 'bun:test'
// --------------------------------------------------------
import { captureLines }        from '../../../platform/capture-lines/capture-lines'
import { pause }               from '../../../testing/pause/pause'
import type { Cluster }        from '../../cluster'
import type { ClusterFixture } from '../cluster-fixture'

export function describeClusterContract(name: string, fixture: ClusterFixture): void {
  describe(`${name} keeps the Cluster contract`, () => {
    let cluster: Cluster
    const key = (name: string) => `test:${crypto.randomUUID()}:${name}`

    beforeEach(async () => {
      cluster = await fixture.open()
    })

    afterEach(() => fixture.close?.(cluster))

    test('counts nothing for a key it does not have', async () => {
      expect(await cluster.count(key('none'))).toBe(0)
    })

    test('increments a key, by what it is told, and says what it holds now', async () => {
      const k = key('a')

      expect(await cluster.increment(k, 1, 60_000)).toBe(1)
      expect(await cluster.increment(k, 2, 60_000)).toBe(3)
      expect(await cluster.increment(k, -1, 60_000)).toBe(2)
      expect(await cluster.count(k)).toBe(2)
    })

    test('increments at once: many side by side never lose one', async () => {
      const k = key('many')

      await Promise.all(Array.from({ length: 50 }, () => cluster.increment(k, 1, 60_000)))

      expect(await cluster.count(k)).toBe(50)
    })

    test('forgets a key once its time to live runs out, or when told', async () => {
      const short = key('short')
      const told = key('told')
      await cluster.increment(short, 1, 30)
      await cluster.increment(told, 1, 60_000)

      await cluster.forget(told)
      await pause(80)

      expect(await cluster.count(short)).toBe(0)
      expect(await cluster.count(told)).toBe(0)
    })

    test('tells every listener of a channel, and no other, until it unsubscribes', async () => {
      const channel = key('channel')
      const heard: string[] = []
      const stop = cluster.subscribe(channel, () => void heard.push('one'))
      cluster.subscribe(channel, () => void heard.push('two'))
      cluster.subscribe(key('other'), () => void heard.push('other'))

      await cluster.publish(channel)
      await pause(30)
      stop()
      await cluster.publish(channel)
      await pause(30)

      expect(heard.sort()).toEqual(['one', 'two', 'two'])
    })

    test('a listener that throws is logged, and the others still hear', async () => {
      const channel = key('throws')
      const heard: string[] = []
      const log = captureLines()
      cluster.subscribe(channel, () => {
        throw new Error('boom')
      })
      cluster.subscribe(channel, () => void heard.push('two'))

      try {
        await cluster.publish(channel)
        await pause(50)
      } finally {
        log.restore()
      }

      expect(heard).toEqual(['two'])
      expect(log.said('error')).toEqual([`[${name}] a listener of ${channel} failed`])
    })
  })
}
