import { Database as SqliteConnection } from 'bun:sqlite'
// --------------------------------------------------------
import { BUSY_TIMEOUT_MS }              from '../when-not-busy/when-not-busy'
import { whenNotBusy }                  from '../when-not-busy/when-not-busy'

export function sqliteConnection(path: string, readonly: boolean): SqliteConnection {
  const db = new SqliteConnection(path, readonly ? { readonly: true, safeIntegers: true } : { create: true, readwrite: true, safeIntegers: true })
  db.run(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`)
  if (!readonly) {
    whenNotBusy(() => db.run('PRAGMA journal_mode = WAL'))
    whenNotBusy(() => db.query('PRAGMA schema_version').get())
    db.run('PRAGMA synchronous = NORMAL')
    db.run('PRAGMA foreign_keys = ON')
  }
  return db
}
