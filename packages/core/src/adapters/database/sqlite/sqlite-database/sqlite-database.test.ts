import { afterAll }                    from 'bun:test'
import { describe }                    from 'bun:test'
import { expect }                      from 'bun:test'
import { test }                        from 'bun:test'
import { mkdtempSync }                 from 'node:fs'
import { rmSync }                      from 'node:fs'
import { tmpdir }                      from 'node:os'
import { join }                        from 'node:path'
// --------------------------------------------------------
import { describeInboxContract }       from '../../../../application/database/contract/describe-inbox-contract/describe-inbox-contract'
import { describeOutboxContract }      from '../../../../application/database/contract/describe-outbox-contract/describe-outbox-contract'
import { describeRecordsContract }     from '../../../../domain/repository/contract/describe-records-contract/describe-records-contract'
import { ContractRow }                 from '../../../../domain/repository/contract/records-fixture'
import { describeSqlDatabaseContract } from '../../sql/contract/describe-sql-database-contract/describe-sql-database-contract'
import { SqliteDatabase }              from './sqlite-database'

const migrations = join(import.meta.dir, '..', 'testing', 'fixtures')
const folders: string[] = []
const newFile = () => {
  const folder = mkdtempSync(join(tmpdir(), 'newt-sqlite-'))
  folders.push(folder)
  return join(folder, 'data.db')
}
afterAll(() => folders.forEach(folder => rmSync(folder, { recursive: true, force: true })))

describeRecordsContract('SqliteDatabase', {
  serial: true,
  open: async () => {
    const database = await SqliteDatabase.open({ path: ':memory:', migrations })
    return { transactions: database, records: database.records<ContractRow>('things') }
  },
  close: world => (world.transactions as SqliteDatabase).close(),
})

describeOutboxContract('SqliteDatabase', {
  open: () => SqliteDatabase.open({ path: ':memory:', migrations }),
  close: database => (database as SqliteDatabase).close(),
})

describeInboxContract('SqliteDatabase', {
  open: () => SqliteDatabase.open({ path: ':memory:', migrations }),
  close: database => (database as SqliteDatabase).close(),
})

describeSqlDatabaseContract('SqliteDatabase', {
  concurrent: false,
  open: async (folder = migrations) => {
    const path = newFile()
    const database = await SqliteDatabase.open({ path, migrations: folder })
    return { database, twin: () => SqliteDatabase.open({ path, migrations: folder }) }
  },
  close: world => (world.database as SqliteDatabase).close(),
})

describe('SqliteDatabase', () => {
  test('keeps what it stored in its file, for the next one that opens it', async () => {
    const path = newFile()
    const first = await SqliteDatabase.open({ path, migrations })
    await first.records<ContractRow>('things').insert({ id: 'a', name: 'a', size: 1, tag: null })
    await first.close()

    const again = await SqliteDatabase.open({ path, migrations })
    try {
      expect(await again.records<ContractRow>('things').count()).toBe(1)
    } finally {
      await again.close()
    }
  })

  test('a write outside a transaction runs in one of its own', async () => {
    const database = await SqliteDatabase.open({ path: ':memory:', migrations })
    try {
      await database.records<ContractRow>('things').insert({ id: 'a', name: 'a', size: 1, tag: null })

      expect(await database.records<ContractRow>('things').count()).toBe(1)
    } finally {
      await database.close()
    }
  })
})
