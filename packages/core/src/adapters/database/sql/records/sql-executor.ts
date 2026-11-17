import type { SqlRow } from '../dialect/sql-run'

export type SqlExecutor = {
  all(sql: string, params: unknown[]): Promise<SqlRow[]>
  run(sql: string, params: unknown[]): Promise<number>
  read(table: string): void
  write<T>(fn: () => Promise<T>): Promise<T>
}
