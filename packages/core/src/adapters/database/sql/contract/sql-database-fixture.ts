import { Database }   from '../../../../application/database/database'
import { SqlRow }     from '../dialect/sql-run'
import { Migrations } from '../migrations/migrations'

export type SqlTestDatabase = Database & {
  readonly migrations: Migrations
  query(sql: string, params?: unknown[]): Promise<SqlRow[]>
}

export type SqlDatabaseWorld = {
  database: SqlTestDatabase
  twin(): Promise<SqlTestDatabase>
}

export type SqlDatabaseFixture = {
  open(migrations?: string): Promise<SqlDatabaseWorld>
  close(world: SqlDatabaseWorld): Promise<void>
  concurrent: boolean
}

export type ItemRow = {
  id: string
  version: number
  name: string | null
  code: string
  active: boolean
  data: unknown
  amount: number | null
}
