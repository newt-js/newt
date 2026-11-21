import type { DataPlace }       from '../../../../application/data/data-place/data-place'
import type { DatabaseAdapter } from '../../../../application/data/database-adapter'
import type { FilesAdapter }    from '../../../../application/data/files-adapter'
import type { Database }        from '../../../../application/database/database'
import type { StorageOptions }  from '../../../../domain/file-storage/files/storage-options'
import type { HttpRouter }      from '../../router/http-router/http-router'

export type DataOptions = {
  /** Its engine, `sqlite()` or `postgres()`, and the folder of its migrations. */
  database: { adapter: DatabaseAdapter, migrations: string }
  files: FilesAdapter
  router: HttpRouter
  place: DataPlace
}

/**
 * A context's data, its database and its files, opened where `place` says. Its router
 * keeps the answers of its idempotent routes in that database, and serves the files
 * when they are kept on disk.
 */
export async function openData(context: string, { database, files, router, place }: DataOptions): Promise<{ database: Database, storage: StorageOptions }> {
  const opened = await database.adapter.open(context, database.migrations, place)
  router.keepAnswersIn(opened)
  try {
    return { database: opened, storage: await files.open(context, { router, place }) }
  } catch (error) {
    // Its files cannot open, so the context does not start: the database it opened is closed.
    await opened.close()
    throw error
  }
}
