import type { Idempotency }       from '../idempotency/idempotency'
import type { IdempotentOptions } from '../idempotency/idempotent/idempotent'
import type { HttpRateLimit }     from '../rate-limits/http-rate-limit'
import type { HttpMethod }        from '../router/http-route'
import type { RouteOptions }      from '../router/route-options'
import type { Authenticator }     from '../session/authenticator'

export type LayeredOptions = Omit<RouteOptions, 'rateLimit'> & { rateLimit: HttpRateLimit[] | false }

export type Layering = {
  method: HttpMethod
  path: string
  options: LayeredOptions
  authenticator: () => Authenticator | null
  keeping: (idempotency: Idempotency) => IdempotentOptions
}
