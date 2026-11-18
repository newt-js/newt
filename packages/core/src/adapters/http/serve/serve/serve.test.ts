import { afterAll }          from 'bun:test'
import { afterEach }         from 'bun:test'
import { beforeAll }         from 'bun:test'
import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { test }              from 'bun:test'
import { mkdtemp }           from 'node:fs/promises'
import { rm }                from 'node:fs/promises'
import { tmpdir }            from 'node:os'
import { join }              from 'node:path'
// --------------------------------------------------------
import { captureLines }      from '../../../../application/platform/capture-lines/capture-lines'
import { clientIp }          from '../../request/client-ip/client-ip'
import { HttpRouter }        from '../../router/http-router/http-router'
import { MAX_BODY_BYTES }    from '../../router/max-body-bytes/max-body-bytes'
import type { ServeOptions } from '../serve-options'
import { serve }             from './serve'

const fixtures = join(import.meta.dir, '..', '..', 'frontend', 'fixtures', 'frontend')
const servers: Bun.Server<undefined>[] = []
let folder: string
let web: string
let backoffice: string

beforeAll(async () => {
  folder = await mkdtemp(join(tmpdir(), 'newt-serve-'))
  web = await mkdtemp(join(tmpdir(), 'newt-web-'))
  backoffice = await mkdtemp(join(tmpdir(), 'newt-backoffice-'))
  await Bun.write(join(folder, 'index.html'), 'the frontend')
  await Bun.write(join(web, 'index.html'), '<p>the web</p>')
  await Bun.write(join(backoffice, 'index.html'), '<p>the backoffice</p>')
  await Bun.write(join(backoffice, 'app.js'), 'the backoffice\'s script')
})

afterAll(async () => {
  for (const each of [folder, web, backoffice]) {
    await rm(each, { recursive: true })
  }
})

afterEach(async () => {
  for (const server of servers.splice(0)) {
    await server.stop(true)
  }
})

function api(): HttpRouter {
  const router = new HttpRouter()
  router.get('/things', () => Response.json(['from the router']), { public: true })
  router.get('/cached', () => Response.json([], { headers: { 'cache-control': 'max-age=60', 'referrer-policy': 'no-referrer' } }), { public: true })
  router.get('/away', () => Response.redirect('https://elsewhere.test/', 302), { public: true })
  router.get('/ip', request => Response.json({ ip: clientIp(request) }), { public: true })
  return router
}

function started(options: Omit<ServeOptions, 'port'>) {
  const server = serve({ port: 0, ...options })
  servers.push(server)
  return (path: string, init?: RequestInit) => fetch(new URL(path, server.url), { redirect: 'manual', ...init })
}

const SECURITY = { 'x-content-type-options': 'nosniff', 'referrer-policy': 'strict-origin-when-cross-origin', 'x-frame-options': 'DENY' }
const headersOf = (response: Response, names: string[]) => Object.fromEntries(names.map(name => [name, response.headers.get(name)]))

describe('serve', () => {
  test('its routers\' routes, and the frontend for the rest', async () => {
    const at = started({ routers: [api()], frontend: folder })

    expect(await (await at('/api/things')).json()).toEqual(['from the router'])
    expect(await (await at('/anything')).text()).toBe('the frontend')
    expect((await at('/api/nothing')).status).toBe(404)
  })

  test('without a frontend, an address no route takes is a plain 404', async () => {
    expect((await started({ routers: [api()] })('/anything')).status).toBe(404)
  })

  test('a router at the root takes its own paths beside the API\'s, and the frontend the rest', async () => {
    const root = new HttpRouter({ prefix: '' })
    root.post('/oauth/token', () => Response.json({ token: 't' }), { public: true })
    const at = started({ routers: [api(), root], frontend: folder })

    expect((await at('/oauth/token', { method: 'POST' })).status).toBe(200)
    expect((await at('/oauth/token')).status).toBe(405)
    expect(await (await at('/oauth/other')).text()).toBe('the frontend')
  })

  test('of several routers, the one with the most specific route answers, whatever their order', async () => {
    const users = new HttpRouter({ public: true })
    users.get('/users/:id', request => new Response(`user ${request.params.id}`))
    const session = new HttpRouter({ public: true })
    session.get('/users/me', () => new Response('me'))

    for (const routers of [[users, session], [session, users]]) {
      const at = started({ routers })
      expect([await (await at('/api/users/me')).text(), await (await at('/api/users/7')).text()]).toEqual(['me', 'user 7'])
    }
  })

  test('takes routes beside the routers\', which win over them', async () => {
    const at = started({ routers: [api()], routes: { '/mcp': () => new Response('mcp'), '/api/things': () => new Response('beside') } })

    expect(await (await at('/mcp')).text()).toBe('mcp')
    expect(await (await at('/api/things')).text()).toBe('beside')
  })

  test('what throws outside a router is the same 500, never a page with the source', async () => {
    const log = captureLines()
    try {
      const response = await started({ routes: { '/webhook': () => {
        throw new Error('secret inside')
      } } })('/webhook')

      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({ error: 'Something went wrong', code: 'internal' })
      expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    } finally {
      log.restore()
    }
  })

  test('in development, Bun\'s own page answers what throws outside a router', async () => {
    const script = `
      import { serve } from '${join(import.meta.dir, 'serve')}'
      const server = serve({ port: 0, development: true, routes: { '/webhook': () => { throw new Error('secret inside') } } })
      const response = await fetch(new URL('/webhook', server.url))
      console.log(response.status, response.headers.get('content-type'))
      server.stop(true)
    `
    const child = Bun.spawn([process.execPath, '-e', script], { stdout: 'pipe', stderr: 'ignore' })
    const output = (await new Response(child.stdout).text()).trim()

    expect(output).toStartWith('500 ')
    expect(output).not.toContain('application/json')
  })

  test('health: GET /health-check, a 200 without a session', async () => {
    const at = started({ routers: [api()], health: true })
    expect(await (await at('/health-check')).json()).toEqual({ status: 'ok' })
    expect((await at('/notes/health-check')).status).toBe(404)
    expect((await started({ routers: [api()] })('/health-check')).status).toBe(404)
  })

  test('once told to stop, its health is a 503 while it drains, and it answers the rest', async () => {
    const server = serve({ port: 0, routers: [api()], health: true, drainMs: 300 })
    const url = server.url
    const stopped = server.stop()

    const health = await fetch(new URL('/health-check', url))
    expect([health.status, await health.json()]).toEqual([503, { status: 'stopping' }])
    expect((await fetch(new URL('/api/things', url))).status).toBe(200)
    await stopped
    await expect(fetch(new URL('/health-check', url))).rejects.toThrow()
  })

  test('a forced stop while it drains closes at once, without waiting the drain again', async () => {
    const server = serve({ port: 0, drainMs: 400, routes: { '/hang': () => new Promise<Response>(() => {}) } })
    const hanging = fetch(new URL('/hang', server.url)).catch(() => null)
    await Bun.sleep(50)
    const draining = server.stop()
    const started = performance.now()
    await server.stop(true)

    expect(performance.now() - started).toBeLessThan(200)
    await Promise.all([draining, hanging])
  })

  test('the server reads the longest body any route takes, and the routes beside them the server\'s', async () => {
    const router = new HttpRouter({ public: true, maxBodyBytes: 100 })
    router.group('/uploads', { maxBodyBytes: 2 * MAX_BODY_BYTES }).post('/file', async request => new Response(String((await request.text()).length)))
    const at = started({ routers: [router], maxBodyBytes: 1000, routes: { '/webhook': { POST: async request => new Response(String((await request.text()).length)) } } })

    expect((await at('/api/uploads/file', { method: 'POST', body: 'x'.repeat(MAX_BODY_BYTES + 10) })).status).toBe(200)
    expect((await at('/webhook', { method: 'POST', body: 'x'.repeat(500) })).status).toBe(200)
  })
})

describe('serve, where a request comes from', () => {
  test('the socket\'s address, whatever X-Forwarded-For says, unless it trusts a proxy', async () => {
    const at = started({ routers: [api()] })
    const behind = started({ routers: [api()], trustProxy: 1 })
    const ipOf = async (call: typeof at, forwarded: string) => (await (await call('/api/ip', { headers: { 'x-forwarded-for': forwarded } })).json() as { ip: string }).ip

    expect(await ipOf(at, '203.0.113.9')).toMatch(/127\.0\.0\.1|::1/)
    expect(await ipOf(behind, '6.6.6.6, 203.0.113.9')).toBe('203.0.113.9')
  })

  test('behind a trusted proxy, an older browser\'s Origin is checked against the host the proxy was asked for', async () => {
    const router = new HttpRouter({ public: true })
    router.post('/cards', () => new Response(null, { status: 204 }))
    const page = { origin: 'https://shop.example', 'x-forwarded-host': 'shop.example' }

    expect((await started({ routers: [router], trustProxy: 1 })('/api/cards', { method: 'POST', headers: page })).status).toBe(204)
    expect((await started({ routers: [router] })('/api/cards', { method: 'POST', headers: page })).status).toBe(403)
  })
})

describe('serve, its security headers', () => {
  test('every answer carries them: the API\'s, its errors, its health, the routes beside it and the frontend', async () => {
    const at = started({ routers: [api()], frontend: folder, health: true, routes: { '/webhook': { POST: () => new Response('ok') } } })

    for (const answer of [await at('/api/things'), await at('/api/nothing'), await at('/health-check'), await at('/webhook', { method: 'POST' }), await at('/'), await at('/api/away')]) {
      expect(headersOf(answer, Object.keys(SECURITY))).toEqual(SECURITY)
    }
  })

  test('an answer\'s own come first, and the frontend\'s may be cached', async () => {
    const at = started({ routers: [api()], frontend: folder })

    expect((await at('/api/cached')).headers.get('referrer-policy')).toBe('no-referrer')
    expect((await at('/')).headers.get('cache-control')).toBeNull()
  })

  test('as it is told: some replaced or left out, none, and HSTS only when asked', async () => {
    const own = await started({ routers: [api()], securityHeaders: { 'x-frame-options': null }, hsts: true })('/api/things')

    expect([own.headers.get('x-frame-options'), own.headers.get('strict-transport-security')]).toEqual([null, 'max-age=31536000'])
    expect(headersOf(await started({ routers: [api()], securityHeaders: false })('/api/things'), Object.keys(SECURITY))).toEqual({ 'x-content-type-options': null, 'referrer-policy': null, 'x-frame-options': null })
  })
})

describe('serve, its frontends', () => {
  test('one from its sources: its index.html for every address no route takes, its script and its public files', async () => {
    const { default: frontend } = await import('../../frontend/fixtures/frontend/index.html')
    const at = started({ routers: [api()], frontend, publicFolder: join(fixtures, 'public') })

    for (const path of ['/', '/boards/1']) {
      const page = await (await at(path)).text()
      expect(page).toContain('A frontend for serve\'s test')
      const script = /<script[^>]*src="([^"]+)"/.exec(page)![1]!
      expect(await (await at(script)).text()).toContain('ready')
    }
    expect(await (await at('/icon.svg')).text()).toContain('<svg')
    expect(await (await at('/api/things')).json()).toEqual(['from the router'])
  })

  test('each address goes to the one with the longest prefix it is under, each with its CSP; under none, a 404', async () => {
    const at = started({ routers: [api()], frontend: [{ path: '/', app: web }, { path: '/backoffice/', app: backoffice }] })

    for (const path of ['/', '/boards/1', '/backofficer']) {
      expect(await (await at(path)).text()).toBe('<p>the web</p>')
    }
    for (const path of ['/backoffice', '/backoffice/users/1']) {
      const page = await at(path)
      expect(await page.text()).toBe('<p>the backoffice</p>')
      expect(page.headers.get('content-security-policy')).toContain('default-src')
    }
    expect(await (await at('/backoffice/app.js')).text()).toBe('the backoffice\'s script')
    expect((await started({ frontend: [{ path: '/backoffice', app: backoffice }] })('/elsewhere')).status).toBe(404)
  })

  test('two at one prefix, or a prefix without its slash, is a mistake said at once', () => {
    expect(() => serve({ port: 0, frontend: [{ path: '/', app: web }, { path: '', app: backoffice }] })).toThrow('starts with /')
    expect(() => serve({ port: 0, frontend: [{ path: '/a', app: web }, { path: '/a/', app: backoffice }] })).toThrow('Two frontends at /a/')
  })
})

describe('serve, a proxy', () => {
  function pair() {
    const router = new HttpRouter({ public: true })
    router.get('/seen', request => Response.json({ host: request.headers.get('x-forwarded-host'), for: request.headers.get('x-forwarded-for'), query: new URL(request.url).search }))
    router.post('/sign-in', async request => new Response(await request.text(), { headers: { 'set-cookie': 'session=1; HttpOnly; Path=/' } }))
    router.get('/packed', () => new Response(Bun.gzipSync('packed'), { headers: { 'content-encoding': 'gzip' } }))
    const backend = serve({ port: 0, routers: [router], trustProxy: 1 })
    servers.push(backend)
    return started({ frontend: [{ path: '/', app: 'unused' }], proxy: { '/api': backend.url.href } })
  }

  test('sends the prefix on, path and query, and says who asked', async () => {
    expect(await (await pair()('/api/seen?x=1', { headers: { host: 'app.example' } })).json()).toEqual({ host: 'app.example', for: expect.stringMatching(/127\.0\.0\.1|::1/), query: '?x=1' })
  })

  test('a write of its own origin goes through, and the answer comes back as it is: its cookie, compressed too', async () => {
    const at = pair()
    const answer = await at('/api/sign-in', { method: 'POST', body: 'hello', headers: { 'sec-fetch-site': 'same-origin', cookie: 'session=0' } })

    expect([answer.status, await answer.text()]).toEqual([200, 'hello'])
    expect(answer.headers.get('set-cookie')).toContain('session=1')
    expect(await (await at('/api/packed')).text()).toBe('packed')
  })
})
