import type { DomainEventEmitter } from '../../events/domain-event-emitter/domain-event-emitter'
import { isEventEmitter }          from '../../events/is-event-emitter/is-event-emitter'
import type { Module }             from '../module/module'
import type { Exposes }            from './exposes'

/** The names a module lists of `kind`, `never` when it lists none or does not write them as a literal (`as const`). */
type Listed<M, Kind extends keyof Exposes> = M extends { readonly exposes: { readonly [K in Kind]: readonly (infer Name extends string)[] } }
  ? string extends Name ? never : Name
  : never

type EventsOf<M> = M extends { readonly events: infer Events extends object } ? Events : Record<never, never>

/** What another feature sees of a module: the use cases and the events it exposes, nothing else. */
export type ModuleContract<M extends Module> = Pick<M, Extract<Listed<M, 'useCases'>, keyof M>> & {
  readonly events: Pick<EventsOf<M>, Extract<Listed<M, 'events'>, keyof EventsOf<M>>>
}

/**
 * A module's contract, built with what it exposes alone: its use cases, bound to it, and
 * its events. A name it exposes that is not one of its use cases or of its events is refused.
 */
export function contractOf<M extends Module>(module: M): ModuleContract<M> {
  const { useCases = [], events = [] } = (module as { exposes?: Exposes }).exposes ?? {}
  const registry = module.useCaseRunner.registry
  const own = (module as { events?: Record<string, unknown> }).events ?? {}
  const contract: Record<string, unknown> = {}
  for (const name of useCases) {
    const method = (module as unknown as Record<string, unknown>)[name]
    if (typeof method !== 'function' || !registry.isUseCase(`${module.name}.${name}`)) {
      throw new Error(`${module.name} exposes ${name}, which is none of its use cases: expose what it marks @UseCase()`)
    }
    contract[name] = method.bind(module)
  }
  const emitters: Record<string, DomainEventEmitter<never>> = {}
  for (const name of events) {
    const emitter = own[name]
    if (!isEventEmitter(emitter)) {
      throw new Error(`${module.name} exposes the event ${name}, which is none of its events: expose a key of its events`)
    }
    emitters[name] = emitter as DomainEventEmitter<never>
  }
  contract.events = Object.freeze(emitters)
  return Object.freeze(contract) as ModuleContract<M>
}
