import type { Authenticator }        from '@newt-js/core/http'
// --------------------------------------------------------
import type { SignInSession_Module } from './modules/sign-in-session/sign-in-session.module'
import { SESSION_COOKIE }            from './modules/sign-in-session/sign-in-session.routes'

/** Who is calling backoffice: the user of the session in its own cookie. auth's sessions never open it. */
export function authenticate(signInSessions: SignInSession_Module): Authenticator {
  return async request => {
    const token = request.cookies.get(SESSION_COOKIE)
    return token ? signInSessions.actorOf(token) : null
  }
}
