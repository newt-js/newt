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

    const cookie = (await router.answer(new Request('http://shop.test/api/out', { method: 'POST', headers: { cookie: 'app_session=token-1' } }))!).headers.get('set-cookie')!

    expect(cookie).toStartWith('app_session=;')
    for (const part of ['Max-Age=0', 'HttpOnly', 'Secure']) {
      expect(cookie).toContain(part)
    }
  })
})
