import { SQL }              from 'bun'
import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
import { join }             from 'node:path'
// --------------------------------------------------------
import { freshPostgres }    from '../testing/fresh-postgres/fresh-postgres'
import { PostgresDatabase } from './postgres-database'

const server = process.env.POSTGRES_TEST_URL

describe.skipIf(!server)('PostgresDatabase, its text', () => {
  test('refuses to open on a column or an index that does not compare by code point, citext among them, naming each', async () => {
    const fresh = await freshPostgres(server!)
    try {
      const opening = PostgresDatabase.open({ url: fresh.url, migrations: join(import.meta.dir, '..', 'testing', 'fixtures-odd') })

      await expect(opening).rejects.toThrow('odd.name (und-x-icu), odd.email (citext), odd.odd_nick (ci)')
      await expect(opening).rejects.toThrow('COLLATE "C"')
    } finally {
      await fresh.drop()
    }
  })

  test('opens on a database that does not compare by code point when every column says COLLATE "C", its own tables too', async () => {
    const name = `newt_test_${crypto.randomUUID().replaceAll('-', '')}`
    const admin = new SQL(server!)
    try {
      await admin.unsafe(`CREATE DATABASE "${name}" TEMPLATE template0 LOCALE_PROVIDER icu ICU_LOCALE 'es' LOCALE 'C'`)
      const url = new URL(server!)
      url.pathname = `/${name}`

      const database = await PostgresDatabase.open({ url: url.href, migrations: join(import.meta.dir, '..', 'testing', 'fixtures') })

      await database.close()
    } finally {
      await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
      await admin.close()
    }
  })

  test('takes plain TEXT on a database made with LOCALE C, and refuses it on one that is not', async () => {
    const migrations = join(import.meta.dir, '..', 'testing', 'fixtures-plain')
    const fresh = await freshPostgres(server!)
    const name = `newt_test_${crypto.randomUUID().replaceAll('-', '')}`
    const admin = new SQL(server!)
    try {
      const database = await PostgresDatabase.open({ url: fresh.url, migrations })
      await database.close()

      await admin.unsafe(`CREATE DATABASE "${name}" TEMPLATE template0 LOCALE_PROVIDER icu ICU_LOCALE 'es' LOCALE 'C'`)
      const url = new URL(server!)
      url.pathname = `/${name}`
      await expect(PostgresDatabase.open({ url: url.href, migrations })).rejects.toThrow("plain.id (the database's es)")
    } finally {
      await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`)
      await admin.close()
      await fresh.drop()
    }
  })
})
