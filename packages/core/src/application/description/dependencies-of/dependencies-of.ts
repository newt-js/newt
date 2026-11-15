import { BrandedEventEmitter }  from '../../../domain/events/is-event-emitter/is-event-emitter'
import { isEventEmitter }       from '../../../domain/events/is-event-emitter/is-event-emitter'
import { isModule }             from '../../../domain/module/is-module/is-module'
import { ModuleDependency }     from '../application-description'
import { holdsModulesOrEvents } from '../holds-modules-or-events/holds-modules-or-events'
import { isPlain }              from '../is-plain/is-plain'
import { moduleId }             from '../module-id/module-id'

export function dependenciesOf(deps: object, owners: Map<BrandedEventEmitter, string>): ModuleDependency[] {
  const found: ModuleDependency[] = []
  const walk = (name: string, value: unknown, within: ReadonlySet<object>): void => {
    if (value === undefined || value === null || (typeof value !== 'object' && typeof value !== 'function')) {
      return
    }
    if (within.has(value)) {
      return
    }
    if (isModule(value)) {
      found.push({ name, kind: 'module', target: moduleId(value.useCaseRunner.registry.context, value.name) })
      return
    }
    if (isEventEmitter(value)) {
      found.push({ name, kind: 'events', target: owners.get(value) ?? null, events: [value.name] })
      return
    }
    const inner = isPlain(value) ? Object.values(value) : []
    const emitters = inner.filter(isEventEmitter)
    const targets = new Set(emitters.map(emitter => owners.get(emitter) ?? null))
    if (emitters.length > 0 && emitters.length === inner.length && targets.size === 1) {
      found.push({ name, kind: 'events', target: [...targets][0]!, events: emitters.map(emitter => emitter.name) })
    } else if (isPlain(value) && holdsModulesOrEvents(value)) {
      for (const [key, each] of Object.entries(value)) {
        walk(`${name}.${key}`, each, new Set([...within, value]))
      }
    } else {
      found.push({ name, kind: 'port', target: null })
    }
  }
  for (const [name, value] of Object.entries(deps)) {
    walk(name, value, new Set())
  }
  return found
}
