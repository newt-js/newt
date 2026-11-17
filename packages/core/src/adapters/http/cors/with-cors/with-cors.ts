import { withHeadersSet }  from '../../responses/with-headers-set/with-headers-set'
import type { HttpRoute }  from '../../router/http-route'
import type { Cors }       from '../cors'
import { corsHeadersOver } from '../cors-headers-over/cors-headers-over'
import { corsHeaders }     from '../cors-headers/cors-headers'

export function withCors(route: HttpRoute, cors: Cors | undefined): HttpRoute {
  if (!cors) {
    return route
  }
  return async request => {
    const response = await route(request)
    return withHeadersSet(response, corsHeadersOver(response.headers, corsHeaders(cors, request)))
  }
}
