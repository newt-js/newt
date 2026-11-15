import { withHeadersSet } from '../../responses/with-headers-set/with-headers-set'
import { HttpRoute }      from '../../router/http-route'

export function noStore(route: HttpRoute): HttpRoute {
  return async request => {
    const response = await route(request)
    return response.headers.has('cache-control') ? response : withHeadersSet(response, { 'cache-control': 'no-store' })
  }
}
