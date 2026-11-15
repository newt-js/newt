import { BrandedEventEmitter }    from '../../../domain/events/is-event-emitter/is-event-emitter'
import { BoundedContext }         from '../../context/bounded-context/bounded-context'
import { ContextBase }            from '../../context/context-base/context-base'
import { ApplicationDescription } from '../application-description'
import { describeContext }        from '../describe-context/describe-context'
import { emittersOf }             from '../emitters-of/emitters-of'
import { moduleId }               from '../module-id/module-id'

export function describeApplication(contexts: readonly (ContextBase | BoundedContext)[]): ApplicationDescription {
  const registries = contexts.map(each => ('base' in each ? each.base : each).useCaseRunner.registry)
  const owners = new Map<BrandedEventEmitter, string>()
  for (const registry of registries) {
    for (const module of registry.registeredModules) {
      for (const emitter of emittersOf(module)) {
        owners.set(emitter, moduleId(registry.context, module.instance.name))
      }
    }
  }
  return { version: 1, contexts: registries.map(registry => describeContext(registry, owners)) }
}
