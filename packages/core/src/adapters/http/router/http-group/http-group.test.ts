import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { MemoryCluster } from '../../../../application/cluster/memory-cluster/memory-cluster'
import { RateLimits }    from '../../../../application/runtime/rate-limits/rate-limits/rate-limits'
import { currentActor }  from '../../../../domain/actor/current-actor/current-actor'
import { systemClock }   from '../../../../domain/clock/system-clock/system-clock'
import { HttpRouter }    from '../http-router/http-router'

const call = (router: HttpRouter, path: string, init: RequestInit = {}) => router.answer(new Request(`http://shop.test${path}`, init))!

const byHeader = async (request: Request) => (request.headers.get('x-user') ? { userId: request.headers.get('x-user')! } : null)

describe('HttpGroup', () => {
  test('runs its middleware around each route, after the session, with both params', async () => {
    const router = new HttpRouter()
    router.authenticateWith(byHeader)
    const workspaces = router.group('/workspaces/:workspaceId', async (request, next) => {
      if (request.params.workspaceId !== 'mine') {
        return Response.json({ error: 'not yours' }, { status: 404 })
      }
      const response = await next()
      response.headers.set('x-workspace', request.params.workspaceId)
      return response
    })
    workspaces.get('/things/:id', request => Response.json({ workspace: request.params.workspaceId, id: request.params.id, user: currentActor().userId }))
    const ana = { headers: { 'x-user': 'ana' } }

    const ok = await call(router, '/api/workspaces/mine/things/7', ana)
    expect(await ok.json()).toEqual({ workspace: 'mine', id: '7', user: 'ana' })
    expect(ok.headers.get('x-workspace')).toBe('mine')
    expect((await call(router, '/api/workspaces/other/things/7', ana)).status).toBe(404)
    expect((await call(router, '/api/workspaces/mine/things/7')).status).toBe(401)
  })

  test('without a middleware, it only puts its prefix before its routes, whose params it types', async () => {
    const router = new HttpRouter({ public: true })
    const folder = router.group('/folders/:folderId')
    folder.get('/notes', request => Response.json({ folder: request.params.folderId }))

    expect(await (await call(router, '/api/folders/7/notes')).json()).toEqual({ folder: '7' })
  })

  test('a public route of it runs its middleware all the same; one that needs a session, never without it', async () => {
    const ran: string[] = []
    const router = new HttpRouter()
    const shops = router.group('/shops/:shopId', (request, next) => {
      ran.push(request.params.shopId)
      return next()
    })
    shops.get('/menu', () => Response.json({ ok: true }), { public: true })
    shops.get('/orders', () => Response.json([]))

    expect((await call(router, '/api/shops/s1/menu')).status).toBe(200)
    expect((await call(router, '/api/shops/s2/orders')).status).toBe(401)
    expect(ran).toEqual(['s1'])
  })

  test('routes each method to its own route', async () => {
    const router = new HttpRouter()
    const group = router.group('/shops/:shopId', (_request, next) => next(), { public: true })
    group.get('/things', () => Response.json('GET'))
    group.post('/things', () => Response.json('POST'))
    group.put('/things', () => Response.json('PUT'))
    group.patch('/things', () => Response.json('PATCH'))
    group.delete('/things', () => Response.json('DELETE'))

    for (const method of ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(await (await call(router, '/api/shops/s1/things', { method })).json()).toBe(method)
    }
  })

  test('rateLimit: false leaves out its router\'s limits, for its routes and the limits they add', async () => {
    const limits = new RateLimits(new MemoryCluster(), 'shop', systemClock)
    const router = new HttpRouter({ public: true, rateLimit: { limit: limits.define('api.calls', { limit: 1, windowMs: 60_000 }), by: 'ip' } })
    const open = router.group('/open', (_request, next) => next(), { rateLimit: false })
    open.get('/free', () => Response.json('free'))
    open.get('/own', () => Response.json('own'), { rateLimit: { limit: limits.define('own.calls', { limit: 2, windowMs: 60_000 }), by: 'ip' } })

    expect([(await call(router, '/api/open/free')).status, (await call(router, '/api/open/free')).status]).toEqual([200, 200])
    expect([(await call(router, '/api/open/own')).status, (await call(router, '/api/open/own')).status, (await call(router, '/api/open/own')).status]).toEqual([200, 200, 429])
  })

  test('without rateLimit, its routes take its router\'s limits', async () => {
    const limits = new RateLimits(new MemoryCluster(), 'shop', systemClock)
    const router = new HttpRouter({ public: true, rateLimit: { limit: limits.define('api.calls', { limit: 1, windowMs: 60_000 }), by: 'ip' } })
    router.group('/shops', (_request, next) => next()).get('/menu', () => Response.json('menu'))

    expect([(await call(router, '/api/shops/menu')).status, (await call(router, '/api/shops/menu')).status]).toEqual([200, 429])
  })
})
