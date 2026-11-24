import type { SessionCookieOptions } from '../session-cookie-options'

/**
 * The name a session cookie goes by: `__Host-<name>` when it can, secure, at path `/` and with no domain. The browser
 * then keeps it only from this host over https, so no other host, nor a page over http, can plant one of its own.
 */
export function sessionCookieName(name: string, { secure, path = '/', domain }: Omit<SessionCookieOptions, 'maxAgeSeconds'>): string {
  return secure && path === '/' && !domain ? `__Host-${name}` : name
}
