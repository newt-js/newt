import type { Cors }          from '../cors/cors'
import type { Idempotency }   from '../idempotency/idempotency'
import type { HttpRateLimit } from '../rate-limits/http-rate-limit'
import type { ErrorHandler }  from './http-route'

export type RouteOptions = {
  public?: boolean
  cors?: Cors
  onError?: ErrorHandler
  rateLimit?: HttpRateLimit | HttpRateLimit[] | false
  maxBodyBytes?: number
  crossOrigin?: boolean
  idempotency?: Idempotency | false
}
