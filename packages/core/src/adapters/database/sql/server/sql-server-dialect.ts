import type { ReservedSQL } from 'bun'
// --------------------------------------------------------
import type { SqlDialect }  from '../dialect/sql-dialect'
import type { SqlRun }      from '../dialect/sql-run'

export type SqlServerDialect = SqlDialect & {
  name: 'postgres' | 'mysql'
  begin: string[]
  failedStatementAborts: boolean
  changed(result: unknown): number
  lock(connection: ReservedSQL, keys: string[], waitMs: number): Promise<void>
  release(connection: ReservedSQL): Promise<void>
  migrationLock(run: SqlRun, key: string): Promise<void>
  committed(result: unknown): void
  rollsBackTransaction(error: unknown): boolean
}
