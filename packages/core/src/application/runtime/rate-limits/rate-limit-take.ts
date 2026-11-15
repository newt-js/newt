export type RateLimitTake = {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterMs: number
}
