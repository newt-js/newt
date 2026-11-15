import { KnownError }         from '../../errors/known-error/known-error'
import { ReferenceNotFound }  from '../../errors/reference-not-found/reference-not-found'
import { DomainEventEmitter } from '../../events/domain-event-emitter/domain-event-emitter'
import { EventMeta }          from '../../events/event/event-meta'
import { Json }               from '../../events/event/json'
import { Subscription }       from '../../events/subscription/subscription'
import { UseCaseRunner }      from '../../use-case/use-case-runner/use-case-runner'
import { MODULE_BRAND }       from '../is-module/is-module'
import { Reaction }           from '../reaction/reaction'
import { Ref }                from '../ref/ref'
import { RefFinder }          from '../ref/ref-finder'

export abstract class Module {

  get [MODULE_BRAND](): true {
    return true
  }

  constructor(
    public readonly name: string,
    public readonly useCaseRunner: UseCaseRunner,
    deps?: object,
  ) {
    useCaseRunner.registry?.module(this, deps)
  }

  on<TPayload extends Json, K extends UseCaseName<this>, TSeen extends TPayload = TPayload>(
    event: Pick<DomainEventEmitter<TPayload>, 'name' | 'subscribe'>,
    useCase: K,
    ...[args, options]: Reaction<this[K], TPayload, TSeen>
  ): () => void {
    const queue = options?.queue ?? `${this.name}.${useCase}.on.${event.name}` as const
    const run = this[useCase] as (...values: unknown[]) => unknown
    const subscription: Subscription<TPayload, TSeen> = {
      strategy: 'handler',
      queue: queue as `${string}.${string}.on.${string}.${string}`,
      ...(options?.attempts === undefined ? {} : { attempts: options.attempts }),
      ...(options?.when === undefined ? {} : { when: options.when }),
    }
    return event.subscribe<TSeen>((payload, meta: EventMeta) => run.apply(this, args ? args(payload, meta) : []), subscription)
  }
}

type UseCaseName<M> = Exclude<keyof M & string, keyof Module>
