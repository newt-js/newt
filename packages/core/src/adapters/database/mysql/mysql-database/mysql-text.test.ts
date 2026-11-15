import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
import { join }          from 'node:path'
// --------------------------------------------------------
import { freshMysql }    from '../testing/fresh-mysql/fresh-mysql'
import { MysqlDatabase } from './mysql-database'

const server = process.env.MYSQL_TEST_URL

describe.skipIf(!server)('MysqlDatabase, its text', () => {
  test('refuses to open on a column that does not compare by code point, naming it', async () => {
    const fresh = await freshMysql(server!)
    try {
      const opening = MysqlDatabase.open({ url: fresh.url, migrations: join(import.meta.dir, '..', 'testing', 'fixtures-odd') })

      await expect(opening).rejects.toThrow('odd.name (utf8mb4_0900_ai_ci)')
      await expect(opening).rejects.toThrow('utf8mb4_0900_bin')
    } finally {
      await fresh.drop()
    }
  })
})
