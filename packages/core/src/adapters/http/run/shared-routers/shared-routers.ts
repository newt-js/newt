import { HttpRouter }        from '../../router/http-router/http-router'
import { PathPattern }       from '../../router/path-pattern/path-pattern'
import type { ContextToRun } from '../run-contexts-options'

export function sharedRouters(contexts: ContextToRun[]): HttpRouter[] {
  const owner = new Map<string, string>()
  const routers: HttpRouter[] = []
  for (const { context, router } of contexts) {
    if (!router) {
      continue
    }
    const fallbacks = new Set([router.prefix, `${router.prefix}/*`])
    for (const path of router.paths()) {
      if (fallbacks.has(path)) {
        continue
      }
      const shape = new PathPattern(path).shape
      if (owner.has(shape)) {
        throw new Error(`${owner.get(shape)} and ${context.name} both take ${path}: one server serves both, so one of them must take another path`)
      }
      owner.set(shape, context.name)
    }
    routers.push(router)
  }
  return routers
}
