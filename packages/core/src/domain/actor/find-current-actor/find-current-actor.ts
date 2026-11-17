import type { Actor } from '../actor'
import { actorScope } from '../actor-scope/actor-scope'

export function findCurrentActor(): Actor | undefined {
  return actorScope.get()
}
