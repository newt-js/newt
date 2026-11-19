import type { BrandedEventEmitter } from '../../../domain/events/is-event-emitter/is-event-emitter'
import { ContextRegistry }          from '../../../domain/registry/context-registry/context-registry'
import type { RegisteredModule }    from '../../../domain/registry/registered-module'
import type { UseCaseOptions }      from '../../../domain/use-case/use-case-options'
import type { ModuleDescription }   from '../application-description'
import { dependenciesOf }           from '../dependencies-of/dependencies-of'
import { emittersOf }               from '../emitters-of/emitters-of'
import { eventId }                  from '../event-id/event-id'
import { featureOfModule }          from '../feature-of-module/feature-of-module'
import { moduleId }                 from '../module-id/module-id'

export function describeModule(registry: ContextRegistry, module: RegisteredModule, owners: Map<BrandedEventEmitter, string>): ModuleDescription {
  const { context } = registry
  const { name } = module.instance
  return {
    id: moduleId(context, name),
    context,
    name,
    feature: featureOfModule(name),
    className: module.className,
    useCases: [...module.useCases].map(([useCase, options]) => ({
      id: `${context}/${name}.${useCase}`,
      name: `${name}.${useCase}`,
      retryOnConflict: (options as UseCaseOptions).retryOnConflict ?? true,
    })),
    events: emittersOf(module).map(emitter => {
      const cron = registry.cron(emitter.name)
      return { id: eventId(context, emitter.name), name: emitter.name, schedule: cron === undefined ? null : { cron } }
    }),
    deps: module.deps ? dependenciesOf(module.deps, owners) : [],
  }
}
