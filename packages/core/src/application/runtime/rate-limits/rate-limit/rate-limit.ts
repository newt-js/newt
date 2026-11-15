import { Clock }            from '../../../../domain/clock/clock'
import { TooManyRequests }  from '../../../../domain/errors/too-many-requests/too-many-requests'
import { RateLimitCounter } from '../rate-limit-counter/rate-limit-counter'
import { RateLimitRule }    from '../rate-limit-rule'
import { RateLimitTake }    from '../rate-limit-take'

export class RateLimit {

  constructor(
    readonly name: string,
    readonly rule: RateLimitRule,
    private readonly counter: RateLimitCounter,
    private readonly clock: Clock,
  ) {}

  async take(key: string): Promise<RateLimitTake> {
    const take = await this.counter.take(this.keyOf(key), this.rule, this.clock.now())
    if (!take.allowed) {
      throw new TooManyRequests(this.name, take.retryAfterMs)
    }
    return take
  }

  forget(key: string): Promise<void> {
    return this.counter.forget(this.keyOf(key), this.rule, this.clock.now())
  }

  private keyOf(key: string): string {
    return `${this.name}:${key}`
  }
}
