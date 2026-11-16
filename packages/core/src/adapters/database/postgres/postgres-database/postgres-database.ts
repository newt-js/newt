import { join }                          from 'node:path'
// --------------------------------------------------------
import type { SqlServerDatabaseOptions } from '../../sql/server/sql-server-database-options'
import { SqlServerDatabase }             from '../../sql/server/sql-server-database/sql-server-database'
import { postgresDialect }               from '../postgres-dialect/postgres-dialect'

const FRAMEWORK = join(import.meta.dir, '..', 'migrations')

export class PostgresDatabase extends SqlServerDatabase {

  static async open(options: SqlServerDatabaseOptions): Promise<PostgresDatabase> {
    const database = PostgresDatabase.connect(options)
    try {
      await database.migrations.up()
      await database.checkText()
    } catch (error) {
      await database.close()
      throw error
    }
    return database
  }

  static connect(options: SqlServerDatabaseOptions): PostgresDatabase {
    return new PostgresDatabase(SqlServerDatabase.pool(options), postgresDialect, options, FRAMEWORK)
  }
}
