import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
// --------------------------------------------------------
import { MemoryCluster }    from '../../../cluster/memory-cluster/memory-cluster'
import { RateLimitCounter } from './rate-limit-counter'

const MINUTE = 60_000
const rule = { limit: 3, windowMs: MINUTE }
const at = new Date('2026-01-01T10:00:00.000Z')
const after = (ms: number) => new Date(at.getTime() + ms)
const counter = (cluster = new MemoryCluster(), context = 'auth') => new RateLimitCounter(cluster, context)

describe('RateLimitCounter', () => {
  test('lets a key through up to its limit, saying what is left', async () => {
    const limits = counter()

    expect(await limits.take('ana', rule, at)).toEqual({ allowed: true, limit: 3, remaining: 2, retryAfterMs: 0 })
    expect((await limits.take('ana', rule, at)).remaining).toBe(1)
    expect((await limits.take('ana', rule, at)).remaining).toBe(0)
  })

  test('refuses the take past the limit, saying how long to wait', async () => {
    const limits = counter()
    for (let i = 0; i < 3; i++) {
      await limits.take('ana', rule, at)
    }

    const refused = await limits.take('ana', rule, after(10_000))

    expect(refused.allowed).toBe(false)
    expect(refused.retryAfterMs).toBeGreaterThan(0)
  })

  test('a take refused is not counted: once enough slid away, one more goes through', async () => {
    const limits = counter()
    for (let i = 0; i < 3; i++) {
      await limits.take('ana', rule, at)
    }
    for (let i = 0; i < 5; i++) {
      await limits.take('ana', rule, after(1_000))
    }

    const refused = await limits.take('ana', rule, after(1_000))
    const later = await limits.take('ana', rule, new Date(after(1_000).getTime() + refused.retryAfterMs))

    expect(later.allowed).toBe(true)
  })

  test('counts the window before as much as it still overlaps', async () => {
    const limits = counter()
    for (let i = 0; i < 3; i++) {
      await limits.take('ana', rule, at)
    }

    expect((await limits.take('ana', rule, after(MINUTE))).allowed).toBe(false)
    expect((await limits.take('ana', rule, after(MINUTE + MINUTE / 2))).allowed).toBe(true)
    expect((await limits.take('ana', rule, after(3 * MINUTE))).remaining).toBe(2)
  })

  test('forgetting a key starts it afresh', async () => {
    const limits = counter()
    for (let i = 0; i < 3; i++) {
      await limits.take('ana', rule, at)
    }

    await limits.forget('ana', rule, at)

    expect((await limits.take('ana', rule, at)).remaining).toBe(2)
  })

  test('keeps each key apart, and each context\'s, on one cluster', async () => {
    const cluster = new MemoryCluster()
    for (let i = 0; i < 3; i++) {
      await counter(cluster, 'auth').take('ana', rule, at)
    }

    expect((await counter(cluster, 'auth').take('bea', rule, at)).allowed).toBe(true)
    expect((await counter(cluster, 'shop').take('ana', rule, at)).allowed).toBe(true)
    expect((await counter(cluster, 'auth').take('ana', rule, at)).allowed).toBe(false)
  })

  test('takes side by side never let more through than the limit', async () => {
    const limits = counter()

    const takes = await Promise.all(Array.from({ length: 20 }, () => limits.take('ana', rule, at)))

    expect(takes.filter(take => take.allowed)).toHaveLength(3)
  })

  test('never keeps the key itself: it may be an email', async () => {
    const cluster = new MemoryCluster()
    const keys: string[] = []
    const increment = cluster.increment.bind(cluster)
    cluster.increment = (key, by, ttlMs) => (keys.push(key), increment(key, by, ttlMs))

    await counter(cluster).take('ana@example.com', rule, at)

    expect(keys.some(key => key.includes('ana@example.com'))).toBe(false)
  })
})
