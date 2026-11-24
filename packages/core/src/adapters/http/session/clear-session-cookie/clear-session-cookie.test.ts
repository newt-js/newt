import { describe }           from 'bun:test'
import { expect }             from 'bun:test'
import { test }               from 'bun:test'
// --------------------------------------------------------
import { HttpRouter }         from '../../router/http-router/http-router'
import { clearSessionCookie } from './clear-session-cookie'

describe('clearSessionCookie', () => {
  test('is the same cookie, empty and already gone', async () => {
    const router = new HttpRouter({ public: true })
    router.post('/out', request => {
      clearSessionCookie(request, 'app_session', { secure: true })
      return new Response(null, { status: 204 })
    })

    const cookie = (await router.answer(new Request('http://shop.test/api/out', { method: 'POST', headers: { cookie: '__Host-app_session=token-1' } }))!).headers.get('set-cookie')!

    expect(cookie).toStartWith('__Host-app_session=;')
    for (const part of ['Max-Age=0', 'HttpOnly', 'Secure']) {
      expect(cookie).toContain(part)
    }
  })

  test('given the domain the cookie was set for, it clears that one', async () => {
    const router = new HttpRouter({ public: true })
    router.post('/out', request => {
      clearSessionCookie(request, 'app_session', { secure: true, domain: 'midominio.com' })
      return new Response(null, { status: 204 })
    })

    const cookie = (await router.answer(new Request('http://shop.test/api/out', { method: 'POST' }))!).headers.get('set-cookie')!

    expect(cookie).toContain('Domain=midominio.com')
  })
})
