import type { HttpRequest }          from '../../request/http-request'
import type { SessionCookieOptions } from '../session-cookie-options'

export function setSessionCookie(request: HttpRequest, name: string, value: string, { secure, maxAgeSeconds, path = '/', domain }: SessionCookieOptions): void {
  request.cookies.set(name, value, { httpOnly: true, sameSite: 'lax', secure, path, maxAge: maxAgeSeconds, ...domain ? { domain } : {} })
}
