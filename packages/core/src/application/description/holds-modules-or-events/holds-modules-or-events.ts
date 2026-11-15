import { isEventEmitter } from '../../../domain/events/is-event-emitter/is-event-emitter'
import { isModule }       from '../../../domain/module/is-module/is-module'
import { isPlain }        from '../is-plain/is-plain'

export function holdsModulesOrEvents(value: Record<string, unknown>, seen = new Set<object>()): boolean {
  seen.add(value)
  return Object.values(value).some(each => isModule(each) || isEventEmitter(each) || (isPlain(each) && !seen.has(each) && holdsModulesOrEvents(each, seen)))
}
