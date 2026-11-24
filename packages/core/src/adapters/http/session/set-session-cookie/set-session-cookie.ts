import type { HttpRequest }          from '../../request/http-request'
import { sessionCookieName }         from '../session-cookie-name/session-cookie-name'
import type { SessionCookieOptions } from '../session-cookie-options'

/** A cookie of a session: never read by scripts, nor sent by another site's requests, and `__Host-` when it can be. */
export function setSessionCookie(request: HttpRequest, name: string, value: string, { secure, maxAgeSeconds, path = '/', domain }: SessionCookieOptions): void {
  const kept = sessionCookieName(name, { secure, path, domain })
  request.cookies.set(kept, value, { httpOnly: true, sameSite: 'lax', secure, path, maxAge: maxAgeSeconds, ...domain ? { domain } : {} })
}
