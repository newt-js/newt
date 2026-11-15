import { Idempotency }       from '../idempotency/idempotency'
import { IdempotentOptions } from '../idempotency/idempotent/idempotent'
import { HttpRateLimit }     from '../rate-limits/http-rate-limit'
import { HttpMethod }        from '../router/http-route'
import { RouteOptions }      from '../router/route-options'
import { Authenticator }     from '../session/authenticator'

export type LayeredOptions = Omit<RouteOptions, 'rateLimit'> & { rateLimit: HttpRateLimit[] | false }

export type Layering = {
  method: HttpMethod
  path: string
  options: LayeredOptions
  authenticator: () => Authenticator | null
  keeping: (idempotency: Idempotency) => IdempotentOptions
}
