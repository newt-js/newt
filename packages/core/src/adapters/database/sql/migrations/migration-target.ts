import { SqlRun } from '../dialect/sql-run'

export interface MigrationTarget {
  transaction<T>(lock: string, fn: (run: SqlRun) => Promise<T>): Promise<T>
  read<T>(fn: (run: SqlRun) => Promise<T>): Promise<T>
  statements(script: string): string[]
  param(n: number): string
  quote(name: string): string
  tableExists(run: SqlRun, table: string): Promise<boolean>
}
