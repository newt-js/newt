import { join }              from 'node:path'
// --------------------------------------------------------
import type { DatabaseKind } from '../../templates/stores/store-databases'
import { STORE_DATABASES }   from '../../templates/stores/store-databases'
import type { FilesKind }    from '../../templates/stores/store-files'
import { STORE_FILES }       from '../../templates/stores/store-files'

export type BackendStores = { database: DatabaseKind, files: FilesKind }

/** The kinds of database and files a backend's src/stores.ts opens, by the classes it names; null without one newt can read. */
export async function backendStores(backend: string): Promise<BackendStores | null> {
  const file = Bun.file(join(backend, 'src/stores.ts'))
  const text = await file.exists() ? await file.text() : ''
  const named = <K extends string>(kinds: Record<K, { className: string }>) => (Object.keys(kinds) as K[]).find(kind => text.includes(kinds[kind].className))
  const database = named(STORE_DATABASES)
  const files = named(STORE_FILES)
  return database && files ? { database, files } : null
}
