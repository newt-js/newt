import type { HttpRateLimit } from '../http-rate-limit'

export type Limits = HttpRateLimit | HttpRateLimit[] | false | undefined

export function listOf(limits: Limits): HttpRateLimit[] {
  return !limits ? [] : Array.isArray(limits) ? limits : [limits]
}
