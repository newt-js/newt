import type { DomainEventEmitter } from '../../events/domain-event-emitter/domain-event-emitter'
import { isEventEmitter }          from '../../events/is-event-emitter/is-event-emitter'
import type { Module }             from '../module/module'
import type { Exposes }            from './exposes'

/** The names a module lists of `kind`, `never` when it lists none or does not write them as a literal (`as const`). */
type Listed<M, Kind extends keyof Exposes> = M extends { readonly exposes: { readonly [K in Kind]: readonly (infer Name extends string)[] } }
  ? string extends Name ? never : Name
  : never

type EventsOf<M> = M extends { readonly events: infer Events extends object } ? Events : Record<never, never>

/** The names of a module's use cases, as far as types tell: its own methods that give a promise. */
type UseCasesOf<M> = { [K in Exclude<keyof M & string, keyof Module>]: M[K] extends (...args: never[]) => Promise<unknown> ? K : never }[Exclude<keyof M & string, keyof Module>]

/** What a module may write as `exposes`: names of its use cases and of its events, as a literal (`as const`). */
export type Exposing<M> = { readonly exposes?: { readonly useCases?: readonly UseCasesOf<M>[], readonly events?: readonly (keyof EventsOf<M> & string)[] } }

/** A type written out, so an editor shows its members and not its name. */
type Flat<T> = { [K in keyof T]: T[K] } & {}

/** What another feature sees of a module: the use cases and the events it exposes, nothing else. */
export type ModuleContract<M extends Module> = Flat<Pick<M, Extract<Listed<M, 'useCases'>, keyof M>> & {
  readonly events: Flat<Pick<EventsOf<M>, Extract<Listed<M, 'events'>, keyof EventsOf<M>>>>
}>

/**
 * A module's contract, built with what it exposes alone: its use cases, bound to it, and
 * its events. A name it exposes that is not one of its use cases or of its events is refused.
 */
export function contractOf<M extends Module>(module: M): ModuleContract<M> {
  const { useCases = [], events = [] } = (module as { exposes?: Exposes }).exposes ?? {}
  const registry = module.useCaseRunner.registry
  const own = (module as { events?: Record<string, unknown> }).events ?? {}
  const contract: Record<string, unknown> = {}
  const listed = (names: string[]) => names.length ? names.join(', ') : 'none'
  for (const name of useCases) {
    const method = (module as unknown as Record<string, unknown>)[name]
    if (typeof method !== 'function' || !registry.isUseCase(`${module.name}.${name}`)) {
      const its = [...registry.registeredModules.find(each => each.instance === module)?.useCases.keys() ?? []]
      throw new Error(`${module.name} exposes ${name}, which is none of its use cases (marked @UseCase()): ${listed(its)}`)
    }
    contract[name] = method.bind(module)
  }
  const emitters: Record<string, DomainEventEmitter<never>> = {}
  for (const name of events) {
    const emitter = own[name]
    if (!isEventEmitter(emitter)) {
      throw new Error(`${module.name} exposes the event ${name}, which is none of its events: ${listed(Object.keys(own).filter(key => isEventEmitter(own[key])))}`)
    }
    emitters[name] = emitter as DomainEventEmitter<never>
  }
  contract.events = Object.freeze(emitters)
  return Object.freeze(contract) as ModuleContract<M>
}
