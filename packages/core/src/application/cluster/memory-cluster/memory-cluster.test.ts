import { afterEach }               from 'bun:test'
import { describe }                from 'bun:test'
import { expect }                  from 'bun:test'
import { setSystemTime }           from 'bun:test'
import { test }                    from 'bun:test'
// --------------------------------------------------------
import { describeClusterContract } from '../contract/describe-cluster-contract/describe-cluster-contract'
import { MemoryCluster }           from './memory-cluster'

describeClusterContract('MemoryCluster', { open: async () => new MemoryCluster() })

describe('MemoryCluster', () => {
  afterEach(() => {
    setSystemTime()
  })

  test('drops the counters whose time ran out, even those never read again', async () => {
    const cluster = new MemoryCluster()
    const counters = (cluster as unknown as { counters: Map<string, unknown> }).counters
    const now = Date.now()
    setSystemTime(now)
    await Promise.all(Array.from({ length: 100 }, (_, i) => cluster.increment(`window:${i}`, 1, 1000)))

    setSystemTime(now + 5000)
    await cluster.increment('window:now', 1, 1000)

    expect(counters.size).toBe(1)
  })
})
