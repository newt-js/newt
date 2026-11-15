import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { Cluster }       from '../../../../application/cluster/cluster'
import { RateLimits }    from '../../../../application/runtime/rate-limits/rate-limits/rate-limits'
import { systemClock }   from '../../../../domain/clock/system-clock/system-clock'
import { MemoryCluster } from '../../../cluster/memory/memory-cluster/memory-cluster'
import { HttpRouter }    from '../../router/http-router/http-router'

function context(name: string, cluster: Cluster) {
  const rateLimits = new RateLimits(cluster, name, systemClock)
  const router = new HttpRouter({ rateLimit: { limit: rateLimits.define('api.calls', { limit: 1, windowMs: 60_000 }) } })
  router.authenticateWith(async request => ({ userId: request.headers.get('x-user')! }))
  router.get('/things', () => Response.json([]))
  return async () => (await router.answer(new Request('http://shop.test/api/things', { headers: { 'x-user': 'ana@example.com' } }))!).status
}

describe('rate limits of routes, across contexts', () => {
  test('two contexts on one cluster keep apart the counts of their limits of one name', async () => {
    const cluster = new MemoryCluster()
    const auth = context('auth', cluster)
    const boards = context('boards', cluster)

    expect([await auth(), await auth(), await boards()]).toEqual([200, 429, 200])
  })

  test('two instances of one context on one cluster share their counts, as instances behind a balancer do', async () => {
    const cluster = new MemoryCluster()
    const one = context('auth', cluster)
    const other = context('auth', cluster)

    expect([await one(), await other()]).toEqual([200, 429])
  })
})
