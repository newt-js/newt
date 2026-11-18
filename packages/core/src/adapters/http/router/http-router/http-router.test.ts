import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
// --------------------------------------------------------
import { captureLines }   from '../../../../application/platform/capture-lines/capture-lines'
import { currentActor }   from '../../../../domain/actor/current-actor/current-actor'
import { NotFoundError }  from '../../../../domain/errors/not-found-error/not-found-error'
import { MAX_BODY_BYTES } from '../max-body-bytes/max-body-bytes'
import { HttpRouter }     from './http-router'

const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

const own = (method: string) => () => Response.json({ method })

const call = (router: HttpRouter, path: string, init: RequestInit = {}) => router.answer(new Request(`http://shop.test${path}`, init))

const json = async (answer: Promise<Response> | null) => (await answer!).json()

const status = async (answer: Promise<Response> | null) => (await answer!).status

const byHeader = async (request: Request) => (request.headers.get('x-user') ? { userId: request.headers.get('x-user')! } : null)

class ThingNotFound extends NotFoundError {
  readonly code = 'thing.not_found'
}

describe('HttpRouter', () => {
  test('answers a registered route under /api, with its params', async () => {
    const router = new HttpRouter()
    router.get('/things/:id', request => Response.json({ id: request.params.id }), { public: true })

    expect(await json(call(router, '/api/things/42'))).toEqual({ id: '42' })
  })

  test('routes each method to its own route', async () => {
    const router = new HttpRouter({ public: true })
    for (const method of METHODS) {
      router[method.toLowerCase() as 'get'](`/things`, own(method))
    }

    for (const method of METHODS) {
      expect(await json(call(router, '/api/things', { method }))).toEqual({ method })
    }
  })

  test('anything else under its prefix, the prefix too, is a 404; outside it, not its own', async () => {
    const router = new HttpRouter({ prefix: '/v1' })
    router.get('/things', own('GET'), { public: true })

    const missing = await call(router, '/v1/nope')!
    expect(missing.status).toBe(404)
    expect(await missing.json()).toMatchObject({ code: 'route_not_found' })
    expect(await status(call(router, '/v1'))).toBe(404)
    expect(call(router, '/api/things')).toBeNull()
    expect(call(router, '/V1/things')).toBeNull()
  })

  test('a static path outranks a param, and a param /*', async () => {
    const router = new HttpRouter({ public: true })
    router.get('/*', own('ANY'))
    router.get('/things/:id', own('ONE'))
    router.get('/things/new', own('NEW'))

    expect(await json(call(router, '/api/things/new'))).toEqual({ method: 'NEW' })
    expect(await json(call(router, '/api/things/7'))).toEqual({ method: 'ONE' })
    expect(await json(call(router, '/api/other/thing'))).toEqual({ method: 'ANY' })
  })

  test('the prefix itself takes a route registered at \'\'', async () => {
    const router = new HttpRouter({ public: true })
    router.get('', own('GET'))

    expect(await json(call(router, '/api'))).toEqual({ method: 'GET' })
    expect(await status(call(router, '/api/other'))).toBe(404)
  })

  test('a method a path does not have is a 405 that lists those it has, OPTIONS too', async () => {
    const router = new HttpRouter({ public: true })
    router.get('/things', own('GET'))
    router.post('/things', own('POST'))

    for (const method of ['DELETE', 'OPTIONS']) {
      const response = await call(router, '/api/things', { method })!
      expect([response.status, response.headers.get('allow'), response.headers.get('cache-control')]).toEqual([405, 'GET, HEAD, POST', 'no-store'])
      expect(await response.json()).toMatchObject({ code: 'method_not_allowed' })
    }
  })

  test('HEAD is answered by the GET route, its status and headers without the body', async () => {
    const router = new HttpRouter({ public: true })
    router.get('/things/:id', request => Response.json({ id: request.params.id }, { headers: { 'x-thing': request.params.id } }))
    router.post('/other', own('POST'))

    const response = (await call(router, '/api/things/7', { method: 'HEAD' }))!
    expect([response.status, response.headers.get('x-thing'), response.headers.get('content-type')]).toEqual([200, '7', 'application/json;charset=utf-8'])
    expect(await response.text()).toBe('')
    expect(await status(call(router, '/api/other', { method: 'HEAD' }))).toBe(405)
  })

  test('paths that differ only in their params\' names are one path, each route with its own names', async () => {
    const router = new HttpRouter({ public: true })
    router.get('/things/:id', request => Response.json({ got: request.params.id }))
    router.delete('/things/:thingId', request => Response.json({ deleted: request.params.thingId }))

    expect(await json(call(router, '/api/things/1'))).toEqual({ got: '1' })
    expect(await json(call(router, '/api/things/1', { method: 'DELETE' }))).toEqual({ deleted: '1' })
    expect(() => router.get('/things/:other', own('GET'))).toThrow('registered twice')
  })

  test('a route needs a session unless it is public: a 401 without one', async () => {
    const router = new HttpRouter()
    router.get('/private', own('GET'))

    const response = await call(router, '/api/private')!
    expect(response.status).toBe(401)
    expect(await response.json()).toMatchObject({ code: 'not_signed_in' })
  })

  test('a signed-in request runs as its actor', async () => {
    const router = new HttpRouter()
    router.authenticateWith(byHeader)
    router.get('/me', () => Response.json(currentActor()))

    expect(await json(call(router, '/api/me', { headers: { 'x-user': 'ana' } }))).toEqual({ userId: 'ana' })
  })

  test('the session comes with its cookies', async () => {
    const router = new HttpRouter()
    router.authenticateWith(async request => (request.cookies.get('session') === 'ana' ? { userId: 'ana' } : null))
    router.get('/me', () => Response.json(currentActor()))

    expect(await json(call(router, '/api/me', { headers: { cookie: 'session=ana' } }))).toEqual({ userId: 'ana' })
  })

  test('onError: a route\'s over its group\'s over its router\'s; a missing session and a 405 are errors too', async () => {
    const asText = (by: string) => (error: unknown, request: Request) => new Response(`${by} ${(error as Error).constructor.name} ${new URL(request.url).pathname}`, { status: 400 })
    const router = new HttpRouter({ prefix: '', onError: asText('router') })
    const fails = () => {
      throw new ThingNotFound('no')
    }
    router.get('/a', fails, { public: true })
    router.get('/b', fails, { public: true, onError: asText('route') })
    router.get('/c', own('GET'))
    router.group('/g', { public: true, onError: asText('group') }).get('/d', fails)
    const text = async (path: string, method = 'GET') => (await call(router, path, { method })!).text()

    expect(await text('/a')).toBe('router ThingNotFound /a')
    expect(await text('/b')).toBe('route ThingNotFound /b')
    expect(await text('/g/d')).toBe('group ThingNotFound /g/d')
    expect(await text('/c')).toBe('router NotSignedIn /c')
    expect(await text('/a', 'POST')).toBe('router MethodNotAllowed /a')
  })

  test('a path\'s 405s answer through its first route\'s onError', async () => {
    const asText = (by: string) => () => new Response(by, { status: 405 })
    const router = new HttpRouter({ prefix: '', public: true })
    router.put('/things/:id', own('PUT'), { onError: asText('first') })
    router.get('/things/:thingId', own('GET'), { onError: asText('second') })

    expect(await (await call(router, '/things/1', { method: 'DELETE' })!).text()).toBe('first')
  })

  test('at the root it takes its own paths only', async () => {
    const root = new HttpRouter({ prefix: '' })
    root.post('/oauth/token', own('POST'), { public: true })

    expect(await status(call(root, '/oauth/token', { method: 'POST' }))).toBe(200)
    expect(await status(call(root, '/oauth/token'))).toBe(405)
    expect(call(root, '/oauth/other')).toBeNull()
    expect(call(root, '/api/other')).toBeNull()
  })

  test('a body that is not JSON is the client\'s fault, and one read twice the route\'s', async () => {
    const router = new HttpRouter({ public: true })
    router.post('/things', async request => Response.json(await request.json()))
    router.post('/twice', async request => Response.json([await request.json(), await request.json()]))
    const post = (path: string, body: string) => call(router, path, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
    const log = captureLines()
    try {
      expect(await status(post('/api/things', '{not json'))).toBe(400)
      expect(await json(post('/api/things', '{"a":1}'))).toEqual({ a: 1 })
      expect(await status(post('/api/twice', '{"a":1}'))).toBe(500)
    } finally {
      log.restore()
    }
  })

  test('a route, a group or a router says how long its bodies may be: a megabyte unless told', async () => {
    const router = new HttpRouter({ public: true, maxBodyBytes: 100 })
    router.post('/small', async request => new Response(await request.text()))
    router.group('/uploads', { maxBodyBytes: 4 * MAX_BODY_BYTES }).post('/file', async request => new Response(await request.text()))
    const post = (path: string, bytes: number) => call(router, path, { method: 'POST', body: new Blob(['x'.repeat(bytes)]).stream() })

    expect(await status(post('/api/small', 50))).toBe(200)
    expect(await status(post('/api/small', 200))).toBe(413)
    expect(await status(post('/api/uploads/file', 2 * MAX_BODY_BYTES))).toBe(200)
    expect(router.largestBody()).toBe(4 * MAX_BODY_BYTES)
  })

  test('no answer is kept by a cache unless its route says otherwise', async () => {
    const router = new HttpRouter({ public: true })
    router.get('/fresh', own('GET'))
    router.get('/cached', () => new Response('ok', { headers: { 'cache-control': 'max-age=60' } }))

    expect((await call(router, '/api/fresh')!).headers.get('cache-control')).toBe('no-store')
    expect((await call(router, '/api/cached')!).headers.get('cache-control')).toBe('max-age=60')
  })
})
