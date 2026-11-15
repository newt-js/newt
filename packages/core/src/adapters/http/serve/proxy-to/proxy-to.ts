import { requestHost } from '../../request/request-host/request-host'

const HOP_BY_HOP = ['connection', 'keep-alive', 'proxy-connection', 'transfer-encoding', 'upgrade', 'te', 'trailer', 'host']

export function proxyTo(target: string): (request: Request, server: Bun.Server<undefined>) => Promise<Response> {
  const origin = new URL(target).origin
  return async (request, server) => {
    const url = new URL(request.url)
    const headers = new Headers(request.headers)
    for (const name of HOP_BY_HOP) {
      headers.delete(name)
    }
    headers.set('x-forwarded-host', requestHost(request) ?? url.host)
    headers.set('x-forwarded-proto', url.protocol.slice(0, -1))
    const from = server.requestIP(request)?.address
    if (from) {
      const before = request.headers.get('x-forwarded-for')
      headers.set('x-forwarded-for', before ? `${before}, ${from}` : from)
    }
    const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
    const answer = await fetch(`${origin}${url.pathname}${url.search}`, {
      method: request.method,
      headers,
      ...(hasBody ? { body: request.body, duplex: 'half' } : {}),
      redirect: 'manual',
      decompress: false,
    } as RequestInit)
    return new Response(answer.body, { status: answer.status, statusText: answer.statusText, headers: new Headers(answer.headers) })
  }
}
