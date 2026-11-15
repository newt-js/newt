import { clientIps } from '../client-ip/client-ips'

export function noteClientIp(request: Request, socket: string | null, trustProxy: number): void {
  const forwarded = trustProxy > 0 ? request.headers.get('x-forwarded-for')?.split(',').map(entry => entry.trim()).filter(Boolean) ?? [] : []
  const address = forwarded.length > 0 ? forwarded[Math.max(0, forwarded.length - trustProxy)]! : socket
  if (address) {
    clientIps.set(request, address)
  }
}
