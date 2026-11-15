import { HttpRouter }  from '../../router/http-router/http-router'
import { PathPattern } from '../../router/path-pattern/path-pattern'

export function answerOf(routers: HttpRouter[], request: Request): Promise<Response> | null {
  let owner: { router: HttpRouter, pattern: PathPattern } | null = null
  for (const router of routers) {
    const pattern = router.match(request)
    if (pattern && (!owner || pattern.outranks(owner.pattern))) {
      owner = { router, pattern }
    }
  }
  if (owner) {
    return owner.router.answer(request)
  }
  for (const router of routers) {
    const answer = router.answer(request)
    if (answer) {
      return answer
    }
  }
  return null
}
