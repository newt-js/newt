import { joined } from '../joined/joined'

const LISTS = ['vary', 'access-control-expose-headers']

export function corsHeadersOver(own: Headers, cors: Record<string, string>): Record<string, string | null> {
  const headers: Record<string, string | null> = { ...cors }
  for (const [name] of own) {
    if (name.startsWith('access-control-allow-') && cors[name] === undefined) {
      headers[name] = null
    }
  }
  for (const name of LISTS) {
    const theirs = own.get(name)
    if (theirs !== null && cors[name] !== undefined) {
      headers[name] = joined(theirs, cors[name])
    }
  }
  return headers
}
