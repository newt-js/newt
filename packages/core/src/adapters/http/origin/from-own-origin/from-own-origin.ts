import { requestHost } from '../../request/request-host/request-host'

export function fromOwnOrigin(request: Request): boolean {
  const site = request.headers.get('sec-fetch-site')
  if (site) {
    return site === 'same-origin' || site === 'none'
  }
  const origin = request.headers.get('origin')
  if (!origin) {
    return true
  }
  try {
    return new URL(origin).host.toLowerCase() === requestHost(request)
  } catch {
    return false
  }
}
