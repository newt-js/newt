import type { Hsts }            from '../security-headers'
import { SECURITY_HEADERS }     from '../security-headers'
import type { SecurityHeaders } from '../security-headers'

const YEAR_SECONDS = 365 * 24 * 60 * 60

export function securityHeadersOf(own: SecurityHeaders | false | undefined, hsts: Hsts | boolean | undefined): Record<string, string> {
  const headers: Record<string, string | null> = own === false ? {} : { ...SECURITY_HEADERS, ...own }
  if (hsts) {
    const { maxAgeSeconds = YEAR_SECONDS, includeSubDomains = false, preload = false } = hsts === true ? {} : hsts
    headers['strict-transport-security'] ??= [`max-age=${maxAgeSeconds}`, includeSubDomains && 'includeSubDomains', preload && 'preload'].filter(Boolean).join('; ')
  }
  return Object.fromEntries(Object.entries(headers).filter((entry): entry is [string, string] => entry[1] !== null).map(([name, value]) => [name.toLowerCase(), value]))
}
