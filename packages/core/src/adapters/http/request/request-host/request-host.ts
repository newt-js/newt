import { requestHosts } from './request-hosts'

export function requestHost(request: Request): string | null {
  return (requestHosts.get(request) ?? request.headers.get('host'))?.toLowerCase() ?? null
}
