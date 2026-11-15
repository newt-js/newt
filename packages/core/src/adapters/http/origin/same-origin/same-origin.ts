import { Cors }               from '../../cors/cors'
import { CrossOriginRefused } from '../../errors/cross-origin-refused/cross-origin-refused'
import { HttpRoute }          from '../../router/http-route'
import { allowedBy }          from '../allowed-by/allowed-by'
import { fromOwnOrigin }      from '../from-own-origin/from-own-origin'

export function sameOrigin(route: HttpRoute, cors: Cors | undefined): HttpRoute {
  return request => {
    if (fromOwnOrigin(request)) {
      return route(request)
    }
    if (!allowedBy(cors, request) || request.headers.has('cookie')) {
      throw new CrossOriginRefused()
    }
    return route(request)
  }
}
