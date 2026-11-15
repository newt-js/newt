import { KnownError } from '../known-error/known-error'

export class TooManyRequests extends KnownError<{ limit: string, retryAfterSeconds: number }> {
  readonly kind = 'too_many_requests'
  readonly code = 'too_many_requests'
  constructor(limit: string, retryAfterMs: number) {
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000)
    super(`Too many requests: try again in ${retryAfterSeconds} s`, { limit, retryAfterSeconds })
  }
}
