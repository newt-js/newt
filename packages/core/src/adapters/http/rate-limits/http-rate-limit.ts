import { RateLimit }        from '../../../application/runtime/rate-limits/rate-limit/rate-limit'
import type { HttpRequest } from '../request/http-request'

export type HttpRateLimit = {
  limit: RateLimit
  by?: 'actor' | 'ip' | ((request: HttpRequest) => string | null)
}
