import type { Exposing }        from '../../module/module-contract/module-contract'
import type { ModuleContract }  from '../../module/module-contract/module-contract'
import { contractOf }           from '../../module/module-contract/module-contract'
import type { Module }          from '../../module/module/module'
import type { UseCaseRunner }   from '../../use-case/use-case-runner/use-case-runner'
import { FEATURE_BRAND }        from '../is-feature/is-feature'
import { FEATURE_MODULES }      from '../is-feature/is-feature'
import type { FeatureIdentity } from '../is-feature/is-feature'

const NAME = /^[a-z][A-Za-z0-9]*$/

/** What the other features of its context see of a feature: each module it shows, with what that module exposes. */
export type FeatureContract<Modules extends Record<string, Module>, Internal extends keyof Modules = never> = {
  readonly [K in Exclude<keyof Modules, Internal>]: ModuleContract<Modules[K]>
} & { readonly [FEATURE_BRAND]: FeatureIdentity, readonly [FEATURE_MODULES]: Modules }

/** How a feature shows its modules: those it keeps `internal` are its own, out of its contract. */
export type FeatureOptions<Key> = { readonly internal?: readonly Key[] }

/** The modules a feature shows, each with what it exposes checked: names of its own use cases and events, `as const`. */
type Shown<Modules> = { [K in keyof Modules]: Exposing<Modules[K]> }

/**
 * A feature's contract, what its entry point returns: its modules, each by its name in the
 * feature (`template`, for `campaigns[template]`), with only what it exposes. Those it keeps
 * `internal` are its own, out of the contract. Each one is a module of this feature, in the
 * context of `base`.
 */
export function defineFeature<Modules extends Record<string, Module>, const Internal extends keyof Modules & string = never>(
  name: string,
  base: { readonly useCaseRunner: UseCaseRunner },
  modules: Modules & Shown<Modules>,
  options: FeatureOptions<Internal> = {},
): FeatureContract<Modules, Internal> {
  if (!NAME.test(name)) {
    throw new Error(`'${name}' cannot name a feature: a word in camelCase, as in campaigns or salesOrders`)
  }
  const { registry } = base.useCaseRunner
  const internal = new Set<string>(options.internal ?? [])
  const contract: Record<string, unknown> = {}
  for (const [key, module] of Object.entries(modules)) {
    if (module.useCaseRunner.registry !== registry) {
      throw new Error(`defineFeature('${name}'): ${module.name} is a module of another context than ${registry.context}'s`)
    }
    const [, feature, own] = /^(.*)\[(.*)\]$/.exec(module.name) ?? []
    if (feature !== name) {
      const named = Object.values(modules).every(each => each.name.startsWith(`${feature}[`)) ? `; or is this feature named ${feature}? defineFeature('${feature}', …)` : ''
      throw new Error(`defineFeature('${name}'): ${key} is ${module.name}, a module of the feature ${feature}: a feature shows only its own modules, ${name}[<module>]${named}`)
    }
    if (own !== key) {
      throw new Error(`defineFeature('${name}'): ${module.name} is shown as ${key}: show it as ${own}`)
    }
    if (!internal.has(key)) contract[key] = contractOf(module)
  }
  const unknown = [...internal].filter(key => !Object.hasOwn(modules, key))
  if (unknown.length > 0) {
    throw new Error(`defineFeature('${name}'): it keeps ${unknown.join(', ')} internal, which are none of its modules: ${Object.keys(modules).join(', ') || 'none'}`)
  }
  registry.feature(name, Object.keys(contract))
  Object.defineProperty(contract, FEATURE_BRAND, { value: Object.freeze({ name, context: registry.context }) })
  Object.defineProperty(contract, FEATURE_MODULES, { value: Object.freeze({ ...modules }) })
  return Object.freeze(contract) as FeatureContract<Modules, Internal>
}
