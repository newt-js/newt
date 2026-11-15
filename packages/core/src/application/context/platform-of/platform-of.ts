import { Platform }       from '../../platform/platform/platform'
import { BoundedContext } from '../bounded-context/bounded-context'
import { ContextBase }    from '../context-base/context-base'

export function platformOf(contexts: readonly (ContextBase | Pick<BoundedContext, 'name' | 'base'>)[]): Platform {
  const platforms = new Set(contexts.map(context => 'base' in context ? context.base.platform : context.platform))
  if (platforms.size > 1) {
    throw new Error(`The contexts ${contexts.map(context => context.name).join(', ')} are not of one platform: give every one of them the same (ContextBaseOptions.platform)`)
  }
  const [platform] = platforms
  if (!platform) {
    throw new Error('No context was given: a platform is the one of the contexts it runs')
  }
  return platform
}
