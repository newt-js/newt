import type { ContextBase }          from '@newt-js/core/application'
import type { HttpRouter }           from '@newt-js/core/http'
import { bodyOf }                    from '@newt-js/core/http'
import { clearSessionCookie }        from '@newt-js/core/http'
import { setSessionCookie }          from '@newt-js/core/http'
// --------------------------------------------------------
import type { SignInSession_Module } from './sign-in-session.module'

/** Secure unless `.env` says otherwise: browsers take secure cookies on localhost too. */
const SECURE = Bun.env.AUTH_COOKIE_SECURE !== 'false'

/** These routes are auth's own: signing out of them is signing out of the auth application. */
const AUTH_SLUG = 'auth'

/** One cookie per application: signing in to one never replaces the session of another. */
export function sessionCookieOf(applicationSlug: string): string {
  return `session_${applicationSlug}`
}

export function registerSignInSessionRoutes(router: HttpRouter, signInSessions: SignInSession_Module, rateLimits: ContextBase['rateLimits']) {
  // Both public: each address, a few a minute.
  const opens = rateLimits.define('signInSession.opens', { limit: 20, windowMs: 60_000 })
  const ends = rateLimits.define('signInSession.ends', { limit: 20, windowMs: 60_000 })
  // Public: it is how one gets a session.
  router.post('/sign-in-sessions', async request => {
    const body = await bodyOf(request)
    const { session, token } = await signInSessions.open(body)
    const maxAgeSeconds = Math.floor((Date.parse(session.expiresAt) - Date.now()) / 1000)
    setSessionCookie(request, sessionCookieOf(session.application.slug), token, { secure: SECURE, maxAgeSeconds })
    return Response.json(session, { status: 201 })
  }, { public: true, rateLimit: { limit: opens, by: 'ip' } })
  // Public too: an expired session still signs out, and its cookie goes.
  router.delete('/sign-in-sessions/current', async request => {
    const name = sessionCookieOf(AUTH_SLUG)
    const token = request.cookies.get(name)
    if (token) {
      await signInSessions.end(token)
    }
    clearSessionCookie(request, name, { secure: SECURE })
    return new Response(null, { status: 204 })
  }, { public: true, rateLimit: { limit: ends, by: 'ip' } })
  return { one: router.group('/sign-in-sessions/:signInSessionId') }
}
