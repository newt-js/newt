import { test }                        from 'bun:test'
import { join }                        from 'node:path'
// --------------------------------------------------------
import { describeInboxContract }       from '../../../../application/database/contract/describe-inbox-contract/describe-inbox-contract'
import { describeOutboxContract }      from '../../../../application/database/contract/describe-outbox-contract/describe-outbox-contract'
import { describeRecordsContract }     from '../../../../domain/repository/contract/describe-records-contract/describe-records-contract'
import type { ContractRow }            from '../../../../domain/repository/contract/records-fixture'
import { describeSqlDatabaseContract } from '../../sql/contract/describe-sql-database-contract/describe-sql-database-contract'
import type { FreshDatabase }          from '../testing/fresh-postgres/fresh-postgres'
import { freshPostgres }               from '../testing/fresh-postgres/fresh-postgres'
import { PostgresDatabase }            from './postgres-database'

const server = process.env.POSTGRES_TEST_URL
const migrations = join(import.meta.dir, '..', 'testing', 'fixtures')

const opened = new Map<PostgresDatabase, FreshDatabase>()

async function open(folder = migrations): Promise<PostgresDatabase> {
  const fresh = await freshPostgres(server!)
  const database = await PostgresDatabase.open({ url: fresh.url, migrations: folder })
  opened.set(database, fresh)
  return database
}

async function close(database: PostgresDatabase): Promise<void> {
  await database.close()
  await opened.get(database)?.drop()
  opened.delete(database)
}

if (!server) {
  test.skip('PostgresDatabase runs against a Postgres: set POSTGRES_TEST_URL=postgres://user@host:port/db', () => {})
} else {
  describeRecordsContract('PostgresDatabase', {
    open: async () => {
      const database = await open()
      return { transactions: database, records: database.records<ContractRow>('things') }
    },
    close: world => close(world.transactions as PostgresDatabase),
  })

  describeOutboxContract('PostgresDatabase', { open: () => open(), close: database => close(database as PostgresDatabase) })

  describeInboxContract('PostgresDatabase', { open: () => open(), close: database => close(database as PostgresDatabase) })

  describeSqlDatabaseContract('PostgresDatabase', {
    concurrent: true,
    open: async (folder = migrations) => {
      const database = await open(folder)
      const url = opened.get(database)!.url
      return { database, twin: () => PostgresDatabase.open({ url, migrations: folder }) }
    },
    close: world => close(world.database as PostgresDatabase),
  })
}
