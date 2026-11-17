import type { Cors } from '../cors'

const MAX_AGE = 86400

export function corsHeaders(cors: Cors, request: Request, methods?: string[]): Record<string, string> {
  const sent = request.headers.get('origin')
  const origin = cors.origin === '*' ? '*' : sent && cors.origin.includes(sent) ? sent : null
  const headers: Record<string, string> = cors.origin === '*' ? {} : { vary: 'origin' }
  if (!origin) {
    return headers
  }
  headers['access-control-allow-origin'] = origin
  if (methods) {
    headers['access-control-allow-methods'] = methods.join(', ')
    if (cors.headers?.length) {
      headers['access-control-allow-headers'] = cors.headers.join(', ')
    }
    headers['access-control-max-age'] = String(cors.maxAge ?? MAX_AGE)
  } else if (cors.expose?.length) {
    headers['access-control-expose-headers'] = cors.expose.join(', ')
  }
  return headers
}
