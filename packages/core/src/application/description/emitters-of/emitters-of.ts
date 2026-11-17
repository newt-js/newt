import type { BrandedEventEmitter } from '../../../domain/events/is-event-emitter/is-event-emitter'
import { isEventEmitter }           from '../../../domain/events/is-event-emitter/is-event-emitter'
import type { RegisteredModule }    from '../../../domain/registry/registered-module'
import { collectValues }            from '../collect-values/collect-values'
import { isPlain }                  from '../is-plain/is-plain'

export function emittersOf(module: RegisteredModule): BrandedEventEmitter[] {
  const given = new Set<unknown>()
  if (module.deps) {
    collectValues(module.deps, value => given.add(value))
  }
  const found = new Set<BrandedEventEmitter>()
  for (const value of Object.values(module.instance as Record<string, unknown>)) {
    if (value === module.deps) {
      continue
    }
    if (isEventEmitter(value)) {
      found.add(value)
    } else if (isPlain(value)) {
      for (const inner of Object.values(value)) {
        if (isEventEmitter(inner)) {
          found.add(inner)
        }
      }
    }
  }
  return [...found].filter(emitter => !given.has(emitter))
}
