import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
// --------------------------------------------------------
import { currentActor }     from '../../../../domain/actor/current-actor/current-actor'
import { findCurrentActor } from '../../../../domain/actor/find-current-actor/find-current-actor'
import { NotFoundError }    from '../../../../domain/errors/not-found-error/not-found-error'
import { MemoryDatabase }   from '../../../database/memory/memory-database/memory-database'
import { HttpRouter }       from './http-router'

class ThingNotFound extends NotFoundError {
  readonly code = 'thing.not_found'
  constructor() {
    super('There is no such thing')
  }
}

const call = (router: HttpRouter, path: string, init: RequestInit = {}) => router.answer(new Request(`http://shop.test${path}`, init))!

const ANA = { headers: { 'x-user': 'ana' } }

const signedIn = () => {
  const router = new HttpRouter()
  router.authenticateWith(async request => request.headers.has('x-user') ? { userId: request.headers.get('x-user')! } : null)
  return router
}

const onlyMine = (request: { params: { thingId: string } }) => {
  if (request.params.thingId !== `of-${currentActor().userId}`) {
    throw new ThingNotFound()
  }
}

describe('HttpRouter.guard', () => {
  test('lets in who may, and refuses the rest with what it throws, at its path and under it', async () => {
    const router = signedIn()
    router.get('/things/:thingId', request => Response.json(request.params.thingId))
    router.group('/things/:thingId').post('/parts', request => Response.json(request.params.thingId))
    router.guard('/things/:thingId', onlyMine)

    for (const [path, method] of [['', 'GET'], ['', 'HEAD'], ['/parts', 'POST']] as const) {
      expect((await call(router, `/api/things/of-ana${path}`, { ...ANA, method })).status).toBe(200)
      expect((await call(router, `/api/things/of-luis${path}`, { ...ANA, method })).status).toBe(404)
    }
    const refused = await call(router, '/api/things/of-luis', ANA)
    expect(await refused.json()).toMatchObject({ code: 'thing.not_found' })
  })

  test('covers routes that come after it, whatever their params are called, and leaves them their own', async () => {
    const router = signedIn()
    router.get('/things/:id', request => Response.json(request.params))
    router.guard('/things/:thingId', onlyMine)
    router.get('/things/:other/parts/:part', request => Response.json(request.params))

    expect(await (await call(router, '/api/things/of-ana', ANA)).json()).toEqual({ id: 'of-ana' })
    expect(await (await call(router, '/api/things/of-ana/parts/7', ANA)).json()).toEqual({ other: 'of-ana', part: '7' })
    expect((await call(router, '/api/things/of-luis/parts/7', ANA)).status).toBe(404)
  })

  test('leaves alone what is not under its path, and what has a name of its own there', async () => {
    const router = signedIn()
    router.get('/things', () => Response.json('all'))
    router.get('/things/mine', () => Response.json('mine'))
    router.get('/things/:thingId', () => Response.json('one'))
    router.get('/thingsabc/:thingId', () => Response.json('others'))
    router.guard('/things/:thingId', onlyMine)

    expect((await call(router, '/api/things', ANA)).status).toBe(200)
    expect((await call(router, '/api/things/mine', ANA)).status).toBe(200)
    expect((await call(router, '/api/thingsabc/of-luis', ANA)).status).toBe(200)
    expect((await call(router, '/api/things/of-luis', ANA)).status).toBe(404)
  })

  test('a route with a param or a * gets past it nowhere', async () => {
    const router = signedIn()
    router.get('/:kind/:id', () => Response.json('param'))
    router.get('/things/:id/*', () => Response.json('rest'))
    router.guard('/things/:thingId', onlyMine)

    expect((await call(router, '/api/others/of-luis', ANA)).status).toBe(200)
    expect((await call(router, '/api/things/of-luis', ANA)).status).toBe(404)
    expect((await call(router, '/api/things/of-luis/a/b', ANA)).status).toBe(404)
    expect((await call(router, '/api/%74hings/of-luis', ANA)).status).toBe(404)
  })

  test('runs once the caller is signed in, and on a public route with no one calling', async () => {
    const seen: (string | undefined)[] = []
    const router = signedIn()
    router.get('/things/:thingId', () => Response.json('private'))
    router.get('/things/:thingId/menu', () => Response.json('public'), { public: true })
    router.guard('/things/:thingId', () => {
      seen.push(findCurrentActor()?.userId)
    })

    expect((await call(router, '/api/things/7')).status).toBe(401)
    expect(seen).toEqual([])
    expect((await call(router, '/api/things/7', ANA)).status).toBe(200)
    expect((await call(router, '/api/things/7/menu')).status).toBe(200)
    expect(seen).toEqual(['ana', undefined])
  })

  test('all that cover a path run, in the order they were given, until one refuses', async () => {
    const seen: string[] = []
    const router = signedIn()
    router.get('/things/:thingId/parts/:part', () => Response.json('ok'))
    router.guard('/things/:thingId/parts/:part', async request => {
      seen.push(`part ${request.params.part}`)
    })
    router.guard('/things/:thingId', async request => {
      seen.push(`thing ${request.params.thingId}`)
      onlyMine(request)
    })

    expect((await call(router, '/api/things/of-ana/parts/7', ANA)).status).toBe(200)
    expect((await call(router, '/api/things/of-luis/parts/7', ANA)).status).toBe(404)
    expect(seen).toEqual(['part 7', 'thing of-ana', 'part 7', 'thing of-luis'])
  })

  test('keeps a first answer from who may no longer go on', async () => {
    let allowed = true
    const router = new HttpRouter({ database: new MemoryDatabase() })
    router.authenticateWith(async () => ({ userId: 'ana' }))
    router.post('/things/:thingId/parts', () => Response.json('made', { status: 201 }), { idempotency: true })
    router.guard('/things/:thingId', () => {
      if (!allowed) {
        throw new ThingNotFound()
      }
    })
    const post = () => call(router, '/api/things/7/parts', { method: 'POST', headers: { 'idempotency-key': 'k1' } })

    expect((await post()).status).toBe(201)
    allowed = false
    expect((await post()).status).toBe(404)
  })

  test('refuses a path no route is at or under, as it would let everyone in, and a *', () => {
    const router = signedIn()
    expect(() => router.guard('/things/:thingId', onlyMine)).toThrow('No route is at /things/:thingId or under it')
    router.get('/things/:thingId', () => Response.json('one'))
    expect(() => router.guard('/thing/:thingId', onlyMine)).toThrow('No route is at /thing/:thingId or under it')
    expect(() => router.guard('/things/*', () => undefined)).toThrow('has no \'*\'')
    expect(() => router.guard('/things/:id', () => undefined)).not.toThrow()
  })

  test('does not compile when it answers, as a false would refuse no one', () => {
    const router = signedIn()
    router.get('/things/:thingId', () => Response.json('one'))
    // @ts-expect-error
    router.guard('/things/:thingId', () => false)
    // @ts-expect-error
    router.guard('/things/:thingId', async () => false)
  })
})
