import type { Database }     from '../../../application/database/database'
import type { Clock }        from '../../../domain/clock/clock'
import type { RouteOptions } from './route-options'

export type HttpRouterOptions = RouteOptions & {
  prefix?: string
  database?: Pick<Database, 'records'>
  clock?: Clock
}
