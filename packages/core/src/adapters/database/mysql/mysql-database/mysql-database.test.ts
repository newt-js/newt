import { test }                        from 'bun:test'
import { join }                        from 'node:path'
// --------------------------------------------------------
import { describeOutboxContract }      from '../../../../application/database/contract/describe-outbox-contract/describe-outbox-contract'
import { describeRecordsContract }     from '../../../../domain/repository/contract/describe-records-contract/describe-records-contract'
import { ContractRow }                 from '../../../../domain/repository/contract/records-fixture'
import { describeSqlDatabaseContract } from '../../sql/contract/describe-sql-database-contract/describe-sql-database-contract'
import { FreshDatabase }               from '../testing/fresh-mysql/fresh-mysql'
import { freshMysql }                  from '../testing/fresh-mysql/fresh-mysql'
import { MysqlDatabase }               from './mysql-database'

const server = process.env.MYSQL_TEST_URL
const migrations = join(import.meta.dir, '..', 'testing', 'fixtures')

const opened = new Map<MysqlDatabase, FreshDatabase>()

async function open(folder = migrations): Promise<MysqlDatabase> {
  const fresh = await freshMysql(server!)
  const database = await MysqlDatabase.open({ url: fresh.url, migrations: folder })
  opened.set(database, fresh)
  return database
}

async function close(database: MysqlDatabase): Promise<void> {
  await database.close()
  await opened.get(database)?.drop()
  opened.delete(database)
}

if (!server) {
  test.skip('MysqlDatabase runs against a MySQL: set MYSQL_TEST_URL=mysql://user@host:port/db', () => {})
} else {
  describeRecordsContract('MysqlDatabase', {
    open: async () => {
      const database = await open()
      return { transactions: database, records: database.records<ContractRow>('things') }
    },
    close: world => close(world.transactions as MysqlDatabase),
  })

  describeOutboxContract('MysqlDatabase', { open: () => open(), close: database => close(database as MysqlDatabase) })

  describeSqlDatabaseContract('MysqlDatabase', {
    concurrent: true,
    open: async (folder = migrations) => {
      const database = await open(folder)
      const url = opened.get(database)!.url
      return { database, twin: () => MysqlDatabase.open({ url, migrations: folder }) }
    },
    close: world => close(world.database as MysqlDatabase),
  })
}
