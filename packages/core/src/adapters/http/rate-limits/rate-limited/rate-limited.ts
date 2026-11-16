import type { RateLimitTake } from '../../../../application/runtime/rate-limits/rate-limit-take'
import { withHeadersSet }     from '../../responses/with-headers-set/with-headers-set'
import type { HttpRoute }     from '../../router/http-route'
import type { HttpRateLimit } from '../http-rate-limit'
import { whoIs }              from '../who-is/who-is'

export function rateLimited(route: HttpRoute, limits: HttpRateLimit[]): HttpRoute {
  if (limits.length === 0) {
    return route
  }
  return async request => {
    let closest: RateLimitTake | null = null
    for (const each of limits.toReversed()) {
      const who = whoIs(each, request)
      if (who === null) {
        continue
      }
      const take = await each.limit.take(who)
      if (!closest || take.remaining < closest.remaining) {
        closest = take
      }
    }
    const response = await route(request)
    if (!closest) {
      return response
    }
    return withHeadersSet(response, { 'ratelimit-limit': String(closest.limit), 'ratelimit-remaining': String(closest.remaining) })
  }
}
