import { HttpRouter } from '../../router/http-router/http-router'
import { Handler }    from '../handler'

export function routesOf(routers: HttpRouter[], answer: Handler): Record<string, Handler> {
  return Object.fromEntries(routers.flatMap(router => router.paths()).map(path => [path, answer]))
}
