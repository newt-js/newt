import { findCurrentActor }    from '../../../domain/actor/find-current-actor/find-current-actor'
import type { Clock }          from '../../../domain/clock/clock'
import { clockScope }          from '../../../domain/clock/clock-scope/clock-scope'
import type { EventBus }       from '../../../domain/events/bus/event-bus'
import type { EventHandler }   from '../../../domain/events/bus/event-handler'
import type { DomainEvent }    from '../../../domain/events/event/domain-event'
import type { Json }           from '../../../domain/events/event/json'
import type { PublishedEvent } from '../../../domain/events/event/published-event'
import type { Subscription }   from '../../../domain/events/subscription/subscription'
import { ContextRegistry }     from '../../../domain/registry/context-registry/context-registry'
import { EventId }             from '../../../domain/value-objects/event-id/event-id'
import { uuidV7 }              from '../../../domain/value-objects/uuid/uuid-v7/uuid-v7'
import type { Database }       from '../../database/database'
import { detached }            from '../../platform/detached/detached'
import { log }                 from '../../platform/log/log'
import { platformScope }       from '../../platform/platform-scope/platform-scope'
import { Platform }            from '../../platform/platform/platform'
import { eventNameMatches }    from '../../runtime/event-name-matches/event-name-matches'
import { Worker }              from '../../runtime/worker/worker/worker'
import { jobsChannel }         from '../jobs-channel/jobs-channel'

export type ContextBusParts = {
  name: string
  database: Database
  worker: Worker
  registry: ContextRegistry
  platform: Platform
  clock: Clock
}

type InMemory = { pattern: string, handler: EventHandler, when?: ((payload: Json) => boolean) | undefined }

export class ContextBus implements EventBus {

  private inMemory: InMemory[] = []

  constructor(private readonly parts: ContextBusParts) {}

  async publish(event: DomainEvent): Promise<void> {
    const { database, worker } = this.parts
    const told: PublishedEvent = {
      id: (event.id ?? uuidV7()) as EventId,
      name: event.name,
      payload: event.payload,
      occurredAt: event.occurredAt,
      actor: event.actor !== undefined ? event.actor : findCurrentActor()?.userId ?? null,
    }
    const queues = await worker.enqueue(told)
    database.afterCommit(() => {
      this.runInMemory(told)
      worker.wake()
      if (queues.length === 0) {
        return
      }
      const { platform, name } = this.parts
      platform.cluster.publish(jobsChannel(name)).catch((error: unknown) => {
        log.error('[EventBus] could not tell the instances of new jobs', { error })
      })
    })
  }

  subscribe(pattern: string, handler: EventHandler, subscription: Subscription = { strategy: 'fire-and-forget' }): () => void {
    const { worker, registry } = this.parts
    const { when } = subscription
    let unsubscribe: () => void
    if (subscription.strategy === 'handler') {
      unsubscribe = worker.register(subscription.queue, pattern, handler, subscription.attempts, when)
    } else {
      const each: InMemory = { pattern, handler, when }
      this.inMemory.push(each)
      unsubscribe = () => {
        this.inMemory = this.inMemory.filter(other => other !== each)
      }
    }
    const forget = registry.subscription(subscription.strategy === 'handler'
      ? { event: pattern, strategy: 'handler', queue: subscription.queue, attempts: subscription.attempts ?? null, filtered: when !== undefined }
      : { event: pattern, strategy: 'fire-and-forget', queue: null, attempts: null, filtered: null })
    return () => {
      forget()
      unsubscribe()
    }
  }

  private runInMemory(event: PublishedEvent): void {
    for (const { pattern, handler, when } of this.inMemory) {
      if (!eventNameMatches(pattern, event.name)) {
        continue
      }
      void Promise.resolve().then(() => detached(() => platformScope.run(this.parts.platform, () => clockScope.run(this.parts.clock, async () => {
        try {
          if (when && !when(event.payload)) {
            return
          }
          await handler(event)
        } catch (error) {
          log.error(`[EventBus] handler error for '${event.name}'`, { event: event.name, error })
        }
      }))))
    }
  }
}
