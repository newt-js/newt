import { Cors }          from '../cors/cors'
import { Idempotency }   from '../idempotency/idempotency'
import { HttpRateLimit } from '../rate-limits/http-rate-limit'
import { ErrorHandler }  from './http-route'

export type RouteOptions = {
  public?: boolean
  cors?: Cors
  onError?: ErrorHandler
  rateLimit?: HttpRateLimit | HttpRateLimit[] | false
  maxBodyBytes?: number
  crossOrigin?: boolean
  idempotency?: Idempotency | false
}
