import type { HttpRateLimit } from '../http-rate-limit'
import type { Limits }        from '../list-of/list-of'
import { listOf }             from '../list-of/list-of'

export function addLimits(outer: Limits, own: Limits): HttpRateLimit[] | false {
  if (own === false) {
    return false
  }
  const all = [...listOf(outer), ...listOf(own)]
  return all.filter((each, i) => all.findIndex(other => other.limit.name === each.limit.name) === i)
}
