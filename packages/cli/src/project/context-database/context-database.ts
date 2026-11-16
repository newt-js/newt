import { join }              from 'node:path'
// --------------------------------------------------------
import type { DatabaseName } from '../../templates/context/databases'
import { CONTEXTS_FOLDER }   from '../backend-contexts/backend-contexts'

const CLASSES: Record<string, DatabaseName> = {
  SqliteDatabase: 'sqlite',
  PostgresDatabase: 'postgres',
  MysqlDatabase: 'mysql',
  MemoryDatabase: 'memory',
}

/** The database a context opens, by the class its <ctx>.context.ts names; null when it names none of newt's. */
export async function contextDatabase(backend: string, context: string): Promise<DatabaseName | null> {
  const file = Bun.file(join(backend, CONTEXTS_FOLDER, context, `${context}.context.ts`))
  const text = await file.exists() ? await file.text() : ''
  const found = Object.entries(CLASSES).find(([name]) => text.includes(name))
  return found ? found[1] : null
}
