import type { HttpRequest }          from '../../request/http-request'
import { sessionCookieName }         from '../session-cookie-name/session-cookie-name'
import type { SessionCookieOptions } from '../session-cookie-options'

/** The value of a session cookie set with `setSessionCookie` and these options, or null when the browser sent none. */
export function readSessionCookie(request: HttpRequest, name: string, options: Omit<SessionCookieOptions, 'maxAgeSeconds'>): string | null {
  return request.cookies.get(sessionCookieName(name, options)) ?? null
}
