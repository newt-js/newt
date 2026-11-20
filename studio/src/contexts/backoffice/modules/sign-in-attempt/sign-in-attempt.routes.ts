import type { HttpRouter }           from '@newt-js/core/http'
import { setSessionCookie }          from '@newt-js/core/http'
// --------------------------------------------------------
import type { SignInAttempt_Module } from './sign-in-attempt.module'

/** Secure unless `.env` says otherwise, as auth's cookies. */
export const SECURE = Bun.env.BACKOFFICE_COOKIE_SECURE !== 'false'

/** The cookie that ties an attempt to the browser that started it, until it comes back from auth. */
export const SIGN_IN_COOKIE = 'backoffice_sign_in'

export function registerSignInAttemptRoutes(router: HttpRouter, signInAttempts: SignInAttempt_Module) {
  // Public: it is how one starts to sign in. The browser goes on to auth, at redirectTo.
  router.post('/sign-in-attempts', async request => {
    const { redirectTo, state } = await signInAttempts.start()
    setSessionCookie(request, SIGN_IN_COOKIE, state, { secure: SECURE, maxAgeSeconds: 10 * 60 })
    return Response.json({ redirectTo }, { status: 201 })
  }, { public: true })
  return { one: router.group('/sign-in-attempts/:signInAttemptId') }
}
