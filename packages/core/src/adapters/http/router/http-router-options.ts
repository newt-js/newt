import { Database }     from '../../../application/database/database'
import { Clock }        from '../../../domain/clock/clock'
import { RouteOptions } from './route-options'

export type HttpRouterOptions = RouteOptions & {
  prefix?: string
  database?: Pick<Database, 'records'>
  clock?: Clock
}
