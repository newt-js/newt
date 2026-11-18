import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { MemoryCluster }   from '../../../../application/cluster/memory-cluster/memory-cluster'
import { RateLimits }      from '../../../../application/runtime/rate-limits/rate-limits/rate-limits'
import { runAsActor }      from '../../../../domain/actor/run-as-actor/run-as-actor'
import { systemClock }     from '../../../../domain/clock/system-clock/system-clock'
import { TooManyRequests } from '../../../../domain/errors/too-many-requests/too-many-requests'
import { clientIps }       from '../../request/client-ip/client-ips'
import { withParams }      from '../../request/with-params/with-params'
import { rateLimited }     from './rate-limited'

const ok = () => new Response('ok')
const limits = () => new RateLimits(new MemoryCluster(), 'shop', systemClock)

function from(ip: string, headers: Record<string, string> = {}) {
  const request = withParams(new Request('http://shop.test/api/things', { headers }), {})
  clientIps.set(request, ip)
  return request
}

describe('rateLimited', () => {
  test('within its limits, the answer says the closest one; past one, TooManyRequests', async () => {
    const all = limits()
    const route = rateLimited(ok, [{ limit: all.define('shop[api].calls', { limit: 5, windowMs: 60_000 }) }, { limit: all.define('shop[thing].list', { limit: 2, windowMs: 60_000 }) }])

    const first = await route(from('1.1.1.1'))
    await route(from('1.1.1.1'))

    expect([first.headers.get('ratelimit-limit'), first.headers.get('ratelimit-remaining')]).toEqual(['2', '1'])
    await expect(route(from('1.1.1.1'))).rejects.toThrow(TooManyRequests)
  })

  test('its own is taken first: one it refuses counts against none above it', async () => {
    const all = limits()
    const api = all.define('shop[api].calls', { limit: 5, windowMs: 60_000 })
    const route = rateLimited(ok, [{ limit: api }, { limit: all.define('shop[thing].list', { limit: 1, windowMs: 60_000 }) }])

    await route(from('1.1.1.1'))
    await expect(route(from('1.1.1.1'))).rejects.toThrow(TooManyRequests)

    expect((await api.take('ip:1.1.1.1')).remaining).toBe(3)
  })

  test('counts each one signed in on their own, and by the address whoever is not', async () => {
    const route = rateLimited(ok, [{ limit: limits().define('shop[thing].list', { limit: 1, windowMs: 60_000 }) }])

    await runAsActor({ userId: 'ana' }, () => route(from('1.1.1.1')))
    await expect(runAsActor({ userId: 'ana' }, () => route(from('2.2.2.2')))).rejects.toThrow(TooManyRequests)
    await runAsActor({ userId: 'bea' }, () => route(from('1.1.1.1')))
    await route(from('1.1.1.1'))
    await expect(route(from('1.1.1.1'))).rejects.toThrow(TooManyRequests)
  })

  test('by ip counts the address even when someone is signed in', async () => {
    const route = rateLimited(ok, [{ limit: limits().define('shop[thing].list', { limit: 1, windowMs: 60_000 }), by: 'ip' }])

    await runAsActor({ userId: 'ana' }, () => route(from('1.1.1.1')))
    await expect(runAsActor({ userId: 'bea' }, () => route(from('1.1.1.1')))).rejects.toThrow(TooManyRequests)
  })

  test('a key of the route\'s own counts by it, and none leaves the request out', async () => {
    const route = rateLimited(ok, [{ limit: limits().define('auth[session].signIn', { limit: 1, windowMs: 60_000 }), by: request => request.headers.get('x-email') }])

    await route(from('1.1.1.1', { 'x-email': 'ana@example.com' }))
    await expect(route(from('2.2.2.2', { 'x-email': 'ana@example.com' }))).rejects.toThrow(TooManyRequests)
    await route(from('1.1.1.1', { 'x-email': 'bea@example.com' }))
    const unkeyed = await route(from('1.1.1.1'))
    expect(unkeyed.headers.has('ratelimit-limit')).toBe(false)
  })
})
