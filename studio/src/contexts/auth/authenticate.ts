import type { Authenticator }        from '@newt-js/core/http'
// --------------------------------------------------------
import type { SignInSession_Module } from './modules/sign-in-session/sign-in-session.module'
import { sessionCookieOf }           from './modules/sign-in-session/sign-in-session.routes'

/** auth's routes take only sessions of the auth application: one of another application never opens them. */
const AUTH_SLUG = 'auth'

/** Who is calling auth: the user of the session in its cookie. */
export function authenticate(signInSessions: SignInSession_Module): Authenticator {
  return async request => {
    const token = request.cookies.get(sessionCookieOf(AUTH_SLUG))
    return token ? signInSessions.actorOf({ token, applicationSlug: AUTH_SLUG }) : null
  }
}
