import { WindowCount } from '../window-count'

export function waitFor({ count, previous }: WindowCount, limit: number, windowMs: number, elapsed: number): number {
  if (count >= limit) {
    return Math.max(1, Math.ceil(windowMs - elapsed + windowMs * (1 - (limit - 1) / count)))
  }
  return Math.max(1, Math.ceil(windowMs * (1 - (limit - 1 - count) / previous) - elapsed))
}
