import type { DatabaseAdapter } from '../../../../application/data/database-adapter'
import { envNameOf }            from '../../../../application/data/env/env'
import { requiredEnv }          from '../../../../application/data/env/env'
import { MemoryDatabase }       from '../../memory/memory-database/memory-database'
import { PostgresDatabase }     from '../postgres-database/postgres-database'

/** A context's database on the server <CONTEXT>_DATABASE_URL names; in memory for its tests. */
export function postgres(): DatabaseAdapter {
  return {
    open: async (context, migrations, place) => {
      if (place === 'memory') return new MemoryDatabase()
      return PostgresDatabase.open({ url: requiredEnv(`${envNameOf(context)}_DATABASE_URL`), migrations })
    },
  }
}
