import type { Clock }         from '../../../../domain/clock/clock'
import type { Cluster }       from '../../../cluster/cluster'
import { checkRule }          from '../check-rule/check-rule'
import { RateLimitCounter }   from '../rate-limit-counter/rate-limit-counter'
import type { RateLimitRule } from '../rate-limit-rule'
import { RateLimit }          from '../rate-limit/rate-limit'

/** `<feature>[<module>].<name>`, or `<module>.<name>` for a module of no feature. */
const NAME = /^[a-z][A-Za-z0-9]*\[[a-z][A-Za-z0-9]*\]\.[a-z][A-Za-z0-9]*$/

export class RateLimits {

  private readonly limits = new Map<string, RateLimit>()
  readonly counter: RateLimitCounter

  constructor(cluster: Cluster, context: string, private readonly clock: Clock) {
    this.counter = new RateLimitCounter(cluster, context)
  }

  define(name: string, rule: RateLimitRule): RateLimit {
    if (!NAME.test(name)) {
      throw new Error(`A rate limit is named <feature>[<module>].<name>, as auth[session].signIn: ${name}`)
    }
    if (this.limits.has(name)) {
      throw new Error(`Rate limit ${name} is defined twice`)
    }
    checkRule(rule)
    const limit = new RateLimit(name, rule, this.counter, this.clock)
    this.limits.set(name, limit)
    return limit
  }
}
