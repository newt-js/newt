import { HttpRouter }        from '../../router/http-router/http-router'
import type { ContextToRun } from '../run-contexts-options'

/** Each context's router, which must answer under /<context>/api: the app, the host and the health count on it. */
export function routersOf(contexts: ContextToRun[]): HttpRouter[] {
  const routers: HttpRouter[] = []
  for (const { context, router } of contexts) {
    if (!router) continue
    const expected = `/${context.name}/api`
    if (router.prefix !== expected) {
      throw new Error(`${context.name}'s router is at ${router.prefix}: a context's routes go under ${expected}`)
    }
    routers.push(router)
  }
  return routers
}
