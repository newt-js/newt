import type { DatabaseAdapter } from '../../../../application/data/database-adapter'
import { envNameOf }            from '../../../../application/data/env/env'
import { SqliteDatabase }       from '../sqlite-database/sqlite-database'

/** A context's database in a SQLite file: <CONTEXT>_DATABASE, or data/<context>.sqlite; in memory for its tests. */
export function sqlite(): DatabaseAdapter {
  return {
    open: (context, migrations, place) => {
      const path = place === 'memory' ? ':memory:' : Bun.env[`${envNameOf(context)}_DATABASE`] ?? `data/${context}.sqlite`
      return SqliteDatabase.open({ path, migrations })
    },
  }
}
