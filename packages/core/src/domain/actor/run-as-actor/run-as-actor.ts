import { Actor }      from '../actor'
import { actorScope } from '../actor-scope/actor-scope'

export function runAsActor<T>(actor: Actor, fn: () => T): T {
  return actorScope.run(actor, fn)
}
