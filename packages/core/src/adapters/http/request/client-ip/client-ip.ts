import { clientIps } from './client-ips'

export function clientIp(request: Request): string | null {
  return clientIps.get(request) ?? null
}
