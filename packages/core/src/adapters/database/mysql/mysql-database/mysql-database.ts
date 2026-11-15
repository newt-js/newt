import { join }                     from 'node:path'
// --------------------------------------------------------
import { SqlServerDatabaseOptions } from '../../sql/server/sql-server-database-options'
import { SqlServerDatabase }        from '../../sql/server/sql-server-database/sql-server-database'
import { mysqlDialect }             from '../mysql-dialect/mysql-dialect'

const FRAMEWORK = join(import.meta.dir, '..', 'migrations')

export class MysqlDatabase extends SqlServerDatabase {

  static async open(options: SqlServerDatabaseOptions): Promise<MysqlDatabase> {
    const database = MysqlDatabase.connect(options)
    try {
      await database.migrations.up()
      await database.checkText()
    } catch (error) {
      await database.close()
      throw error
    }
    return database
  }

  static connect(options: SqlServerDatabaseOptions): MysqlDatabase {
    return new MysqlDatabase(SqlServerDatabase.pool(options), mysqlDialect, options, FRAMEWORK)
  }
}
