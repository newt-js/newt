import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import type { Cors }  from '../../cors/cors'
import { HttpRouter } from './http-router'

const ANY: Cors = { origin: '*', headers: ['authorization', 'content-type'], expose: ['mcp-session-id'] }
const PREFLIGHT = { method: 'OPTIONS', headers: { origin: 'https://inspector.test', 'access-control-request-method': 'POST' } }

const call = (router: HttpRouter, path: string, init: RequestInit = {}) => router.answer(new Request(`http://shop.test${path}`, init))!

describe('cors on a router\'s routes', () => {
  test('they answer the preflight, and say so in every answer, errors too', async () => {
    const router = new HttpRouter({ cors: ANY })
    router.get('/things', () => Response.json([]), { public: true })
    router.post('/things', () => Response.json({}, { status: 201 }))

    const preflight = await call(router, '/api/things', PREFLIGHT)
    expect(preflight.status).toBe(204)
    expect(preflight.headers.get('access-control-allow-methods')).toBe('GET, HEAD, POST, OPTIONS')
    expect((await call(router, '/api/things', { headers: { origin: 'https://inspector.test' } })).headers.get('access-control-expose-headers')).toBe('mcp-session-id')
    const refused = await call(router, '/api/things', { method: 'POST' })
    expect([refused.status, refused.headers.get('access-control-allow-origin')]).toEqual([401, '*'])
    const notAllowed = await call(router, '/api/things', { method: 'DELETE' })
    expect([notAllowed.status, notAllowed.headers.get('access-control-allow-origin')]).toEqual([405, '*'])
  })

  test('only a route or a group that asks for it: OPTIONS is a 405 elsewhere', async () => {
    const router = new HttpRouter({ public: true })
    router.post('/token', () => Response.redirect('https://elsewhere.test', 302), { cors: ANY, crossOrigin: true })
    router.get('/authorize', () => new Response('page'))
    router.group('/open', { cors: ANY }).get('/one', () => new Response('one'))

    expect((await call(router, '/api/token', PREFLIGHT)).status).toBe(204)
    const redirect = await call(router, '/api/token', { method: 'POST' })
    expect([redirect.status, redirect.headers.get('access-control-allow-origin')]).toEqual([302, '*'])
    expect((await call(router, '/api/open/one', PREFLIGHT)).status).toBe(204)
    expect((await call(router, '/api/authorize', PREFLIGHT)).status).toBe(405)
    expect((await call(router, '/api/authorize')).headers.get('access-control-allow-origin')).toBeNull()
  })

  test('a write from another origin its cors names goes through, without cookies', async () => {
    const router = new HttpRouter({ public: true })
    router.post('/token', () => new Response(null, { status: 204 }), { cors: { origin: ['https://inspector.test'] } })
    const elsewhere = { 'sec-fetch-site': 'cross-site', origin: 'https://inspector.test' }

    expect((await call(router, '/api/token', { method: 'POST', headers: elsewhere })).status).toBe(204)
    expect((await call(router, '/api/token', { method: 'POST', headers: { ...elsewhere, cookie: 'session=ana' } })).status).toBe(403)
  })
})
