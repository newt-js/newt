import type { HttpRouter }           from '@newt-js/core/http'
import { clearSessionCookie }        from '@newt-js/core/http'
import { setSessionCookie }          from '@newt-js/core/http'
// --------------------------------------------------------
import type { SignInSession_Deps }   from './sign-in-session.deps'
import type { SignInSession_Module } from './sign-in-session.module'

/** Secure unless `.env` says otherwise, as auth's cookies. */
const SECURE = Bun.env.BACKOFFICE_COOKIE_SECURE !== 'false'

/** The cookie of a backoffice session: not auth's, which lives at backoffice's subdomain of auth. */
export const SESSION_COOKIE = 'backoffice_session'

/** Where the browser goes once signed in: backoffice's front. */
const SIGNED_IN_PATH = '/'

export function registerSignInSessionRoutes(
  router: HttpRouter,
  signInSessions: SignInSession_Module,
  { signInAttempt: signInAttempts }: SignInSession_Deps,
) {
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
  return { one: router.group('/sign-in-sessions/:signInSessionId') }
}
