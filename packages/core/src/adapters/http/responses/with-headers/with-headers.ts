import { withHeadersSet } from '../with-headers-set/with-headers-set'

export function withHeaders(response: Response, headers: Record<string, string>): Response {
  const missing = Object.entries(headers).filter(([name]) => !response.headers.has(name))
  return missing.length === 0 ? response : withHeadersSet(response, Object.fromEntries(missing))
}
