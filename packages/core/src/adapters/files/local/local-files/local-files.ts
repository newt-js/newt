import { envNameOf }         from '../../../../application/data/env/env'
import { requiredEnv }       from '../../../../application/data/env/env'
import type { FilesAdapter } from '../../../../application/data/files-adapter'
import type { FilesRouter }  from '../../../../application/data/files-adapter'
import { MemoryStorage }     from '../../memory/memory-storage/memory-storage'
import { LocalStorage }      from '../local-storage/local-storage'

const PATH = '/files'
const MAX_UPLOAD = 100 * 1024 * 1024

/**
 * A context's files on disk: in <CONTEXT>_FILES, or data/files/<context>, served by its
 * router at /files with URLs signed with FILES_SECRET; in memory for its tests.
 */
export function localFiles(): FilesAdapter {
  return {
    open: async (context, { router, host, place }) => {
      if (place === 'memory') return { private: new MemoryStorage() }
      const files = await LocalStorage.open({
        folder: Bun.env[`${envNameOf(context)}_FILES`] ?? `data/files/${context}`,
        baseUrl: `${publicUrlOf(router, host)}${PATH}`,
        secret: requiredEnv('FILES_SECRET'),
      })
      router.get(`${PATH}/*`, request => files.handler(request), { public: true })
      router.put(`${PATH}/*`, request => files.handler(request), { public: true, maxBodyBytes: MAX_UPLOAD })
      return { private: files }
    },
  }
}

/** Where a context's routes answer from outside: its own host, or the backend's PUBLIC_URL; under its prefix on both. */
function publicUrlOf(router: FilesRouter, host: string | undefined): string {
  const backend = requiredEnv('PUBLIC_URL')
  const origin = host ? `${new URL(backend).protocol}//${host}` : backend
  return `${origin}${router.prefix}`
}
