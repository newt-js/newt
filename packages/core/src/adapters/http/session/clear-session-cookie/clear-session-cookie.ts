import { HttpRequest }          from '../../request/http-request'
import { SessionCookieOptions } from '../session-cookie-options'
import { setSessionCookie }     from '../set-session-cookie/set-session-cookie'

export function clearSessionCookie(request: HttpRequest, name: string, options: Omit<SessionCookieOptions, 'maxAgeSeconds'>): void {
  setSessionCookie(request, name, '', { ...options, maxAgeSeconds: 0 })
}
