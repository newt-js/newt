import type { ContextBase }          from '@newt-js/core/application'
import type { HttpRouter }           from '@newt-js/core/http'
import { clearSessionCookie }        from '@newt-js/core/http'
import { setSessionCookie }          from '@newt-js/core/http'
// --------------------------------------------------------
import type { SignInSession_Deps }   from './sign-in-session.deps'
import type { SignInSession_Module } from './sign-in-session.module'

/** Secure unless `.env` says otherwise, as auth's cookies. */
const SECURE = Bun.env.BACKOFFICE_COOKIE_SECURE !== 'false'

/** The cookie of a backoffice session: not auth's, which lives at backoffice's subdomain of auth. `__Host-` as the attempt's. */
export const SESSION_COOKIE = `${SECURE ? '__Host-' : ''}backoffice_session`

/** Where the browser goes once signed in: backoffice's front. */
const SIGNED_IN_PATH = '/'

export function registerSignInSessionRoutes(
  router: HttpRouter,
  signInSessions: SignInSession_Module,
  { signInAttempt: signInAttempts }: SignInSession_Deps,
  rateLimits: ContextBase['rateLimits'],
) {
  const ends = rateLimits.define('signInSession.ends', { limit: 20, windowMs: 60_000 })
  // Public: auth sends the browser here with its code. The attempt is finished by its module, and the session opened here.
  router.get('/sign-in-sessions/callback', async request => {
    const query = Object.fromEntries(new URL(request.url).searchParams)
    const cookies = Object.fromEntries(request.cookies.entries())
    const { attempt, spentCookie } = await signInAttempts.finish({ query, cookies })
    clearSessionCookie(request, spentCookie, { secure: SECURE })
    const { session, token } = await signInSessions.open({ attemptId: attempt.id })
    const maxAgeSeconds = Math.floor((Date.parse(session.expiresAt) - Date.now()) / 1000)
    setSessionCookie(request, SESSION_COOKIE, token, { secure: SECURE, maxAgeSeconds })
    return new Response(null, { status: 302, headers: { 'location': SIGNED_IN_PATH, 'cache-control': 'no-store' } })
  }, { public: true })
  // Who is signed in: the front asks it to know whether to start signing in.
  router.get('/sign-in-sessions/current', async request => {
    return Response.json(await signInSessions.current(request.cookies.get(SESSION_COOKIE) ?? ''))
  })
  // Public: an expired session still signs out, and its cookie goes. The front sends the browser on to redirectTo.
  router.delete('/sign-in-sessions/current', async request => {
    const ended = await signInSessions.end(request.cookies.get(SESSION_COOKIE) ?? '')
    clearSessionCookie(request, SESSION_COOKIE, { secure: SECURE })
    return Response.json(ended, { headers: { 'cache-control': 'no-store' } })
  }, { public: true, rateLimit: { limit: ends, by: 'ip' } })
  return { one: router.group('/sign-in-sessions/:signInSessionId') }
}
