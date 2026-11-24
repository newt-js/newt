import { withParams }       from '../../request/with-params/with-params'
import type { HttpRoute }   from '../../router/http-route'
import { paramsOf }         from '../../router/params-of/params-of'
import type { PathPattern } from '../../router/path-pattern/path-pattern'
import { partsOf }          from '../../router/path-pattern/path-pattern'
import type { RouteGuard }  from '../../router/route-guard'

export type Guarding = { pattern: PathPattern, guard: RouteGuard }

export function guarded(route: HttpRoute, guards: () => Guarding[]): HttpRoute {
  return async request => {
    const { params } = request
    const parts = partsOf(new URL(request.url).pathname) ?? []
    for (const { pattern, guard } of guards()) {
      const values = pattern.matchStart(parts)
      if (!values) {
        continue
      }
      try {
        await guard(withParams(request, paramsOf(pattern, values)))
      } finally {
        withParams(request, params)
      }
    }
    return route(request)
  }
}
