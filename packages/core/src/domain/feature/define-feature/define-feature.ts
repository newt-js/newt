import type { ModuleContract }  from '../../module/module-contract/module-contract'
import { contractOf }           from '../../module/module-contract/module-contract'
import type { Module }          from '../../module/module/module'
import type { UseCaseRunner }   from '../../use-case/use-case-runner/use-case-runner'
import { FEATURE_BRAND }        from '../is-feature/is-feature'
import type { FeatureIdentity } from '../is-feature/is-feature'

const NAME = /^[a-z][A-Za-z0-9]*$/

/** What the other features of its context see of a feature: each module it shows, with what that module exposes. */
export type FeatureContract<Modules extends Record<string, Module>> = {
  readonly [K in keyof Modules]: ModuleContract<Modules[K]>
} & { readonly [FEATURE_BRAND]: FeatureIdentity }

/**
 * A feature's contract, what its entry point returns: the modules it shows, each by its
 * name in the feature (`template`, for `campaigns[template]`), with only what it exposes.
 * A module it leaves out is the feature's own. Each one is a module of this feature, in
 * the context of `base`.
 */
export function defineFeature<Modules extends Record<string, Module>>(name: string, base: { readonly useCaseRunner: UseCaseRunner }, modules: Modules): FeatureContract<Modules> {
  if (!NAME.test(name)) {
    throw new Error(`'${name}' cannot name a feature: a word in camelCase, as in campaigns or salesOrders`)
  }
  const { registry } = base.useCaseRunner
  const contract: Record<string, unknown> = {}
  for (const [key, module] of Object.entries(modules)) {
    if (module.useCaseRunner.registry !== registry) {
      throw new Error(`defineFeature('${name}'): ${module.name} is a module of another context than ${registry.context}'s`)
    }
    if (module.name !== `${name}[${key}]`) {
      throw new Error(`The feature ${name} shows ${module.name} as ${key}: it shows its own modules, each by its name in it, ${name}[${key}] as ${key}`)
    }
    contract[key] = contractOf(module)
  }
  registry.feature(name, Object.keys(modules))
  Object.defineProperty(contract, FEATURE_BRAND, { value: Object.freeze({ name, context: registry.context }) })
  return Object.freeze(contract) as FeatureContract<Modules>
}
