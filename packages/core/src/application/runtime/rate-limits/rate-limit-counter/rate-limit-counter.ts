import type { Cluster }       from '../../../cluster/cluster'
import { checkRule }          from '../check-rule/check-rule'
import { hashedKey }          from '../hashed-key/hashed-key'
import type { RateLimitRule } from '../rate-limit-rule'
import type { RateLimitTake } from '../rate-limit-take'
import { slide }              from '../slide/slide'

export class RateLimitCounter {

  constructor(private readonly cluster: Cluster, private readonly context: string) {}

  async take(key: string, rule: RateLimitRule, at: Date): Promise<RateLimitTake> {
    checkRule(rule)
    const id = hashedKey(this.context, key)
    const start = this.windowOf(rule, at)
    const ttl = 2 * rule.windowMs
    const previous = await this.cluster.count(this.keyOf(id, start - rule.windowMs))
    const count = await this.cluster.increment(this.keyOf(id, start), 1, ttl)
    const { take } = slide({ start, count: count - 1, previous }, rule, at)
    if (!take.allowed) {
      await this.cluster.increment(this.keyOf(id, start), -1, ttl)
    }
    return take
  }

  async forget(key: string, rule: RateLimitRule, at: Date): Promise<void> {
    const id = hashedKey(this.context, key)
    const start = this.windowOf(rule, at)
    await Promise.all([this.cluster.forget(this.keyOf(id, start)), this.cluster.forget(this.keyOf(id, start - rule.windowMs))])
  }

  private windowOf(rule: RateLimitRule, at: Date): number {
    return Math.floor(at.getTime() / rule.windowMs) * rule.windowMs
  }

  private keyOf(id: string, start: number): string {
    return `newt:rate-limit:${id}:${start}`
  }
}
