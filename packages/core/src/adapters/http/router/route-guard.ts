import type { HttpRequest } from '../request/http-request'

/** Who may go on under a path: it throws to refuse. It answers nothing, so a `false` that would refuse no one does not compile. */
export type RouteGuard<Path extends string = string> = (request: HttpRequest<Path>) => void | Promise<void>
