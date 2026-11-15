import { EventBus }            from '../bus/event-bus'
import { eventOfQueue }        from '../event-of-queue/event-of-queue'
import { DomainEventClass }    from '../event/domain-event-class'
import { EventMeta }           from '../event/event-meta'
import { Json }                from '../event/json'
import { PublishedEvent }      from '../event/published-event'
import { EVENT_EMITTER_BRAND } from '../is-event-emitter/is-event-emitter'
import { Subscription }        from '../subscription/subscription'

export class DomainEventEmitter<TPayload extends Json> {

  constructor(
    private readonly bus: EventBus,
    private readonly eventClass: DomainEventClass<TPayload>,
  ) {}

  get [EVENT_EMITTER_BRAND](): true {
    return true
  }

  get name(): string {
    return this.eventClass.eventName
  }

  subscribe<TSeen extends TPayload = TPayload>(handler: (payload: TSeen, meta: EventMeta) => unknown, subscription: Subscription<TPayload, TSeen>): () => void {
    if (subscription.strategy === 'handler' && eventOfQueue(subscription.queue) !== this.name) {
      throw new Error(`A handler's queue is '<module>.<use case>.on.${this.name}': '${subscription.queue}' is not`)
    }
    const run = async ({ id, name, payload, occurredAt, actor }: PublishedEvent, signal?: AbortSignal) => {
      await handler(payload as TSeen, { id, name, occurredAt, actor: actor ?? null, ...(signal ? { signal } : {}) })
    }
    return this.bus.subscribe(this.name, run, subscription as Subscription)
  }
}
