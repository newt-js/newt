import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
// --------------------------------------------------------
import { HttpRouter }       from '../../router/http-router/http-router'
import { setSessionCookie } from './set-session-cookie'

async function cookieOf(secure: boolean, path?: string, domain?: string) {
  const router = new HttpRouter({ public: true })
  router.post('/in', request => {
    setSessionCookie(request, 'app_session', 'token-1', { secure, maxAgeSeconds: 3600, ...(path ? { path } : {}), ...(domain ? { domain } : {}) })
    return new Response(null, { status: 204 })
  })
  return (await router.answer(new Request('http://shop.test/api/in', { method: 'POST' }))!).headers.get('set-cookie')!
}

describe('setSessionCookie', () => {
  test('cannot be read by the page\'s scripts, nor sent by another site\'s requests', async () => {
    const cookie = await cookieOf(true)

    expect(cookie).toStartWith('app_session=token-1')
    for (const part of ['HttpOnly', 'SameSite=Lax', 'Secure', 'Path=/', 'Max-Age=3600']) {
      expect(cookie).toContain(part)
    }
  })

  test('is sent over plain HTTP only when not secure, as on localhost', async () => {
    expect(await cookieOf(false)).not.toContain('Secure')
  })

  test('goes to every subdomain of the domain given, and only to its host without one', async () => {
    expect(await cookieOf(true, undefined, 'midominio.com')).toContain('Domain=midominio.com')
    expect(await cookieOf(true)).not.toContain('Domain=')
  })

  test('goes only to the path given', async () => {
    expect(await cookieOf(true, '/api/session')).toContain('Path=/api/session')
  })
})
