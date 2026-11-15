import { RateLimitRule } from '../rate-limit-rule'
import { RateLimitTake } from '../rate-limit-take'
import { waitFor }       from '../wait-for/wait-for'
import { WindowCount }   from '../window-count'

export function slide(count: WindowCount | null, { limit, windowMs }: RateLimitRule, at: Date): { count: WindowCount, take: RateLimitTake } {
  const now = at.getTime()
  const start = Math.floor(now / windowMs) * windowMs
  const moved = !count || count.start < start - windowMs
    ? { start, count: 0, previous: 0 }
    : count.start < start
      ? { start, count: 0, previous: count.count }
      : count
  const elapsed = now - start
  const used = moved.previous * (1 - elapsed / windowMs) + moved.count
  if (used + 1 <= limit) {
    return { count: { ...moved, count: moved.count + 1 }, take: { allowed: true, limit, remaining: Math.floor(limit - used - 1), retryAfterMs: 0 } }
  }
  return { count: moved, take: { allowed: false, limit, remaining: 0, retryAfterMs: waitFor(moved, limit, windowMs, elapsed) } }
}
