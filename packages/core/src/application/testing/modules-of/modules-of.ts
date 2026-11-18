import type { FeatureContract } from '../../../domain/feature/define-feature/define-feature'
import { FEATURE_MODULES }      from '../../../domain/feature/is-feature/is-feature'
import type { Module }          from '../../../domain/module/module/module'

/** A feature's modules, whole, as its entry point built them: for its tests, which call what its contract does not show. */
export function modulesOf<Modules extends Record<string, Module>>(feature: FeatureContract<Modules, keyof Modules>): Modules {
  return feature[FEATURE_MODULES]
}
