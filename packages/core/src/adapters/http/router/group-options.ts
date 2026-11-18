import type { Middleware }   from './middleware'
import type { RouteOptions } from './route-options'

/** A group's options: those of every route in it, and the middleware they run behind. */
export type GroupOptions<Prefix extends string> = RouteOptions & {
  middleware?: Middleware<Prefix>
}
