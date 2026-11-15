import { RedisClient }             from 'bun'
import { afterEach }               from 'bun:test'
import { describe }                from 'bun:test'
import { expect }                  from 'bun:test'
import { test }                    from 'bun:test'
// --------------------------------------------------------
import { describeClusterContract } from '../../../../application/cluster/contract/describe-cluster-contract/describe-cluster-contract'
import { ValkeyCluster }           from './valkey-cluster'

const url = process.env.VALKEY_URL
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

if (!url) {
  test.skip('ValkeyCluster runs against a Valkey: set VALKEY_URL', () => {})
} else {
  describeClusterContract('ValkeyCluster', {
    open: async () => new ValkeyCluster(url),
    close: cluster => (cluster as ValkeyCluster).close(),
  })

  describe('ValkeyCluster', () => {
    const opened: ValkeyCluster[] = []
    const open = () => {
      const cluster = new ValkeyCluster(url)
      opened.push(cluster)
      return cluster
    }

    afterEach(async () => {
      await Promise.all(opened.splice(0).map(cluster => cluster.close()))
    })

    test('two instances share their counters and hear each other', async () => {
      const here = open()
      const there = open()
      const key = `test:${crypto.randomUUID()}`
      const heard: string[] = []
      there.subscribe(key, () => void heard.push('there'))
      await pause(50)

      await here.increment(key, 2, 60_000)
      await here.publish(key)
      await pause(50)

      expect(await there.count(key)).toBe(2)
      expect(heard).toEqual(['there'])
    })

    test('a channel heard before its connection drops is heard again once it reconnects', async () => {
      const cluster = open()
      const admin = new RedisClient(url)
      const channel = `test:${crypto.randomUUID()}`
      const heard: string[] = []
      const pubsubIds = async () => [...String(await admin.send('CLIENT', ['LIST', 'TYPE', 'pubsub'])).matchAll(/id=(\d+)/g)].map(found => found[1]!)
      const before = await pubsubIds()
      cluster.subscribe(channel, () => void heard.push('before'))
      await cluster.publish(channel)
      await pause(50)

      for (const id of (await pubsubIds()).filter(id => !before.includes(id))) {
        await admin.send('CLIENT', ['KILL', 'ID', id])
      }
      cluster.subscribe(channel, () => void heard.push('after'))
      const since = Date.now()
      while (!heard.includes('after') && Date.now() - since < 3000) {
        await cluster.publish(channel)
        await pause(50)
      }
      admin.close()

      expect(heard).toContain('after')
      expect(heard.filter(who => who === 'before').length).toBeGreaterThan(1)
    })

    test('counts and hears again after its connections give up reconnecting', async () => {
      const alone = new URL(url)
      alone.pathname = '/13'
      const admin = new RedisClient(url)
      const clientIds = async () => [...String(await admin.send('CLIENT', ['LIST'])).matchAll(/id=(\d+) .* db=13 /g)].map(found => found[1]!)
      const before = await clientIds()
      const cluster = new ValkeyCluster(alone.href, { maxRetries: 0 })
      opened.push(cluster)
      const channel = `test:${crypto.randomUUID()}`
      const heard: string[] = []
      cluster.subscribe(channel, () => void heard.push('heard'))
      await cluster.increment(channel, 1, 60_000)
      await cluster.publish(channel)
      await pause(50)

      for (const id of (await clientIds()).filter(id => !before.includes(id))) {
        await admin.send('CLIENT', ['KILL', 'ID', id])
      }
      heard.length = 0
      let counted: number | null = null
      const since = Date.now()
      while ((counted === null || heard.length === 0) && Date.now() - since < 3000) {
        counted ??= await cluster.increment(channel, 1, 60_000).catch(() => null)
        await admin.publish(channel, '')
        await pause(50)
      }
      admin.close()

      expect(counted).toBe(2)
      expect(heard.length).toBeGreaterThan(0)
    })
  })
}
