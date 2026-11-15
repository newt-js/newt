import { SqlRow }       from './sql-run'
import { SqlRun }       from './sql-run'
import { TableColumns } from './table-columns'

export type SqlDialect = {
  name: 'postgres' | 'mysql' | 'sqlite'
  param(n: number): string
  quote(identifier: string): string
  always: string
  never: string
  distinct(column: string, param: string): string
  ieq(column: string, next: () => string): string
  boolean(value: boolean): unknown
  nullsLast?: boolean | undefined
  json?(param: string): string
  parsesJson?: boolean | undefined
  columns(run: SqlRun, table: string): Promise<TableColumns>
  isCollision(error: unknown): boolean
  collidingColumns(error: unknown, run: SqlRun, table: string): Promise<string[]>
  isConflict(error: unknown): boolean
  forUpdate: string
  claim(run: SqlRun, queues: string[], limit: number, worker: string, leaseUntil: string, now: string): Promise<SqlRow[]>
  upsertQueue: string
  statements(script: string): string[]
  tableExists(run: SqlRun, table: string): Promise<boolean>
  oddText(run: SqlRun): Promise<string[]>
  textHint: string
}
