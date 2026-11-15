import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { join }           from 'node:path'
// --------------------------------------------------------
import { SqliteDatabase } from './sqlite-database'

describe('SqliteDatabase, its text', () => {
  test('refuses to open on a column that does not compare by code point, naming it', async () => {
    const opening = SqliteDatabase.open({ path: ':memory:', migrations: join(import.meta.dir, '..', 'testing', 'fixtures-odd') })

    await expect(opening).rejects.toThrow('odd.name (NOCASE), odd.title (NOCASE), odd.note (RTRIM), odd.full name (NOCASE), odd.code (NOCASE)')
    await expect(opening).rejects.toThrow('BINARY')
  })
})
