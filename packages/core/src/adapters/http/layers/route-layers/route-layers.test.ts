import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { MemoryCluster } from '../../../../application/cluster/memory-cluster/memory-cluster'
import { RateLimits }    from '../../../../application/runtime/rate-limits/rate-limits/rate-limits'
import { systemClock }   from '../../../../domain/clock/system-clock/system-clock'
import { HttpRouter }    from '../../router/http-router/http-router'
import { ROUTE_LAYERS }  from './route-layers'

describe('route layers', () => {
  test('are, from the outermost: no-store, cookies, cors, handled, same origin, signed in, rate limited, guarded, idempotent', () => {
    expect(ROUTE_LAYERS.map(layer => layer.name)).toEqual(['noStore', 'cookies', 'cors', 'handled', 'sameOrigin', 'signedIn', 'rateLimited', 'guarded', 'idempotent'])
  })

  test('a request goes through each in order: its origin, its session, its limit, its guards, its group\'s middleware, its route', async () => {
    const seen: string[] = []
    const limit = new RateLimits(new MemoryCluster(), 'shop', systemClock).define('api.calls', { limit: 1, windowMs: 60_000 })
    const take = limit.take.bind(limit)
    limit.take = key => {
      seen.push('rateLimited')
      return take(key)
    }
    const router = new HttpRouter({ rateLimit: { limit } })
    router.authenticateWith(async request => {
      seen.push('signedIn')
      return request.headers.has('x-user') ? { userId: 'ana' } : null
    })
    const group = router.group('/things', {
      middleware: async (_, next) => {
        seen.push('middleware')
        return next()
      },
      cors: { origin: ['https://a.example'] },
    })
    group.post('', async () => {
      seen.push('route')
      return Response.json({ made: true }, { status: 201 })
    })
    router.guard('/things', () => {
      seen.push('guarded')
    })
    const post = (headers: Record<string, string>) => router.answer(new Request('http://shop.test/api/things', { method: 'POST', headers }))!

    expect((await post({ 'x-user': 'ana' })).status).toBe(201)
    expect(seen.splice(0)).toEqual(['signedIn', 'rateLimited', 'guarded', 'middleware', 'route'])

    const refused = await post({ 'x-user': 'ana', origin: 'https://a.example', 'sec-fetch-site': 'same-origin' })
    expect([refused.status, refused.headers.get('cache-control'), refused.headers.get('access-control-allow-origin')]).toEqual([429, 'no-store', 'https://a.example'])
    expect(seen.splice(0)).toEqual(['signedIn', 'rateLimited'])

    expect((await post({ 'x-user': 'ana', 'sec-fetch-site': 'cross-site', cookie: 'session=1' })).status).toBe(403)
    expect(seen.splice(0)).toEqual([])

    expect((await post({})).status).toBe(401)
    expect(seen.splice(0)).toEqual(['signedIn'])
  })
})
