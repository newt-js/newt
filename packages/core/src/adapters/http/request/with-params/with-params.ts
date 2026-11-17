import type { HttpRequest } from '../http-request'

export function withParams<Path extends string = string>(request: Request, params: Record<string, string>): HttpRequest<Path> {
  Object.defineProperty(request, 'params', { value: params, configurable: true })
  if (!Object.getOwnPropertyDescriptor(request, 'cookies')) {
    let cookies: Bun.CookieMap | undefined
    Object.defineProperty(request, 'cookies', { get: () => (cookies ??= new Bun.CookieMap(request.headers.get('cookie') ?? '')), configurable: true })
  }
  return request as HttpRequest<Path>
}
