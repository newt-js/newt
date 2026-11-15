import { afterEach }        from 'bun:test'
import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
import { mkdtemp }          from 'node:fs/promises'
import { rm }               from 'node:fs/promises'
import { tmpdir }           from 'node:os'
import { join }             from 'node:path'
// --------------------------------------------------------
import { sqliteConnection } from './sqlite-connection'

const folders: string[] = []

afterEach(async () => {
  await Promise.all(folders.splice(0).map(folder => rm(folder, { recursive: true, force: true })))
})

const freshFile = async () => {
  const folder = await mkdtemp(join(tmpdir(), 'newt-sqlite-connection-'))
  folders.push(folder)
  return join(folder, 'db.sqlite')
}

describe('sqliteConnection', () => {
  test('opens a writer in WAL mode, with foreign keys on, normal sync, a busy timeout and exact integers', async () => {
    const db = sqliteConnection(await freshFile(), false)
    expect(db.query('PRAGMA journal_mode').get()).toEqual({ journal_mode: 'wal' })
    expect(db.query('PRAGMA foreign_keys').get()).toEqual({ foreign_keys: 1n })
    expect(db.query('PRAGMA synchronous').get()).toEqual({ synchronous: 1n })
    expect(db.query('PRAGMA busy_timeout').get()).toEqual({ timeout: 5000n })
    db.close()
  })

  // -----

  test('opens a reader that cannot write', async () => {
    const path = await freshFile()
    const writer = sqliteConnection(path, false)
    writer.run('CREATE TABLE t (a INTEGER)')
    const reader = sqliteConnection(path, true)
    expect(() => reader.run('INSERT INTO t (a) VALUES (1)')).toThrow()
    expect(reader.query('SELECT count(*) AS n FROM t').get()).toEqual({ n: 0n })
    reader.close()
    writer.close()
  })
})
