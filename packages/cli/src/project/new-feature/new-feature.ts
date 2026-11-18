import { CommandError }       from '../../commands/command-error/command-error'
import type { ContextFolder } from '../backend-contexts/backend-contexts'

/** Refuses a new feature named like a module of its context: newt add deps would not tell one from the other. */
export function refuseFeatureNamedLikeModule(context: ContextFolder, feature: string): void {
  const owner = context.features.find(each => each.modules.includes(feature))
  if (owner) {
    throw new CommandError(`'${feature}' cannot name a feature of ${context.name}: ${owner.name} has a module of that name; name the feature in plural, by what it groups`)
  }
}
