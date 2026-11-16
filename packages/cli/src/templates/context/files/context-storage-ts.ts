import type { ContextNames }    from '../../../names/context-names/context-names'
import type { StorageTemplate } from '../storages'

export function contextStorageTs(names: ContextNames, storage: StorageTemplate): string {
  const constants = storage.servesFiles ? `\nconst FILES_PATH = '/files/${names.folder}'\n\nconst MAX_UPLOAD_BYTES = 100 * 1024 * 1024\n` : ''
  return `import type { StorageOptions } from '@newt-js/core'
import type { HttpRouter } from '@newt-js/core/http'
${storage.imports.join('\n')}
${constants}
export async function open${names.type}Storage(router: HttpRouter): Promise<StorageOptions> {
${storage.body(names)}
}
`
}
