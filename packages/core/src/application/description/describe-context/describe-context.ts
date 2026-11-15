import { BrandedEventEmitter } from '../../../domain/events/is-event-emitter/is-event-emitter'
import { ContextRegistry }     from '../../../domain/registry/context-registry/context-registry'
import { ContextDescription }  from '../application-description'
import { describeModule }      from '../describe-module/describe-module'
import { eventId }             from '../event-id/event-id'

export function describeContext(registry: ContextRegistry, owners: Map<BrandedEventEmitter, string>): ContextDescription {
  const { context } = registry
  const modules = registry.registeredModules.map(module => describeModule(registry, module, owners))
  const uses = new Set(modules.flatMap(module => module.deps.map(dep => dep.target?.split('/')[0])).filter(each => each !== undefined && each !== context))
  return {
    name: context,
    uses: [...uses] as string[],
    modules,
    subscriptions: registry.subscriptions.map(({ event, strategy, queue, attempts, filtered }) => ({
      event: eventId(context, event),
      strategy,
      queue,
      handler: queue === null ? null : queue.slice(0, queue.indexOf('.on.')),
      attempts,
      filtered,
    })),
  }
}
