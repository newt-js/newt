import type { Module }          from '../../module/module/module'
import type { UseCaseRunner }   from '../../use-case/use-case-runner/use-case-runner'
import { FEATURE_BRAND }        from '../is-feature/is-feature'
import type { FeatureIdentity } from '../is-feature/is-feature'

const NAME = /^[a-z][A-Za-z0-9]*$/

/**
 * A feature of a context: a class that builds its modules in its `static initialize`, is given
 * them by name and holds each one in a field, so the other features reach it as `contacts.contact`.
 * Every module it is given must be its own, `<feature>[<module>]` under its `<module>` key, in the
 * context of `base`.
 */
export abstract class Feature {

  readonly #identity: FeatureIdentity

  constructor(name: string, base: { readonly useCaseRunner: UseCaseRunner }, modules: Readonly<Record<string, Module>>) {
    if (!NAME.test(name)) {
      throw new Error(`'${name}' cannot name a feature: a word in camelCase, as in campaigns or salesOrders`)
    }
    const { registry } = base.useCaseRunner
    const own: string[] = []
    for (const [key, module] of Object.entries(modules)) {
      if (module.useCaseRunner.registry !== registry) {
        throw new Error(`The feature ${name}: ${module.name} is a module of another context than ${registry.context}'s`)
      }
      // Module refuses any name but `<feature>[<module>]`.
      const [, feature, ownName] = /^(.*)\[(.*)\]$/.exec(module.name)!
      if (feature !== name) {
        throw new Error(`The feature ${name}: ${module.name} is a module of the feature ${feature}: a feature holds only its own modules, ${name}[<module>]`)
      }
      if (ownName !== key) {
        throw new Error(`The feature ${name}: ${module.name} is given as ${key}: each module goes under its own name, ${ownName}`)
      }
      own.push(ownName)
    }
    registry.feature(name, own)
    this.#identity = Object.freeze({ name, context: registry.context })
  }

  get [FEATURE_BRAND](): FeatureIdentity {
    return this.#identity
  }
}
