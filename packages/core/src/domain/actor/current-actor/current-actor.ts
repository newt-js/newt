import type { Actor } from '../actor'
import { actorScope } from '../actor-scope/actor-scope'
import { NoActor }    from '../no-actor/no-actor'

export function currentActor(): Actor {
  const actor = actorScope.get()
  if (actor === undefined) {
    throw new NoActor()
  }
  return actor
}
