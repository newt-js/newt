import { platformOf }   from '../../../../application/context/platform-of/platform-of'
import { Platform }     from '../../../../application/platform/platform/platform'
import { ContextToRun } from '../run-contexts-options'

export function platformToRun(contexts: ContextToRun[], withoutContexts: Platform | undefined): Platform {
  if (contexts.length === 0 && withoutContexts) {
    return withoutContexts
  }
  const platform = platformOf(contexts.map(({ context }) => context))
  if (withoutContexts && withoutContexts !== platform) {
    throw new Error(`platformWithoutContexts is not the platform of ${contexts.map(({ context }) => context.name).join(', ')}: give them the same, or none`)
  }
  return platform
}
