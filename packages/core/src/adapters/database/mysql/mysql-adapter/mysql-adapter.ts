import type { DatabaseAdapter } from '../../../../application/data/database-adapter'
import { envNameOf }            from '../../../../application/data/env/env'
import { requiredEnv }          from '../../../../application/data/env/env'
import { MemoryDatabase }       from '../../memory/memory-database/memory-database'
import { MysqlDatabase }        from '../mysql-database/mysql-database'

/** A context's database on the server <CONTEXT>_DATABASE_URL names; in memory for its tests. */
export function mysql(): DatabaseAdapter {
  return {
    open: async (context, migrations, place) => {
      if (place === 'memory') return new MemoryDatabase()
      return MysqlDatabase.open({ url: requiredEnv(`${envNameOf(context)}_DATABASE_URL`), migrations })
    },
  }
}
