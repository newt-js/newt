import { requestHosts } from '../request-host/request-hosts'

export function noteRequestHost(request: Request, trustProxy: number): void {
  if (trustProxy <= 0) {
    return
  }
  const forwarded = request.headers.get('x-forwarded-host')?.split(',').map(entry => entry.trim()).filter(Boolean) ?? []
  if (forwarded.length > 0) {
    requestHosts.set(request, forwarded[Math.max(0, forwarded.length - trustProxy)]!)
  }
}
