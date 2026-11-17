import type { RateLimitRule } from '../rate-limit-rule'

export function checkRule({ limit, windowMs }: RateLimitRule): void {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error(`A rate limit's limit is a whole number from 1: ${limit}`)
  }
  if (!Number.isInteger(windowMs) || windowMs < 1) {
    throw new Error(`A rate limit's window is a whole number of milliseconds from 1: ${windowMs}`)
  }
}
