import type { Database }     from '../../../application/database/database'
import type { Clock }        from '../../../domain/clock/clock'
import type { RouteOptions } from './route-options'

export type HttpRouterOptions = RouteOptions & {
  prefix?: string
  /** The context's own host, when it answers at one: its public address is there, not at PUBLIC_URL. */
  host?: string
  database?: Pick<Database, 'records'>
  clock?: Clock
}
