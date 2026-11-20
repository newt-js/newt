import { defineValueObject }  from '@newt-js/core'
import { z }                  from 'zod'
// --------------------------------------------------------
import { InvalidRedirectUri } from '../errors/invalid-redirect-uri'

/** Where a browser may be sent with a code, http only on this machine (OAuth 2.1 §2.3.1 and §8.4.2). */
const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]'])

/** Absolute, written as a browser writes it (no spaces, no user), never with a fragment, and https but on the loopback. */
function isRedirectUri(text: string): boolean {
  const url = URL.parse(text)
  if (!url || url.href !== text || url.username !== '' || url.password !== '' || text.includes('#')) {
    return false
  }
  return url.protocol === 'https:' || (url.protocol === 'http:' && LOOPBACK.has(url.hostname))
}

/** A uri a client is sent back to, kept as given: it is compared exactly, character by character. */
export const RedirectUri = defineValueObject(
  z.string().max(2000).refine(isRedirectUri).brand<'RedirectUri'>(),
  text => new InvalidRedirectUri(text),
)
export type RedirectUri = z.output<typeof RedirectUri.schema>
