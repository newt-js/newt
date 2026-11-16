import { join }                 from 'node:path'
// --------------------------------------------------------
import type { FileChange }      from '../../../commands/command'
import type { ContextNames }    from '../../../names/context-names/context-names'
import { CONTEXTS_FOLDER }      from '../../../project/backend-contexts/backend-contexts'
import { contextStorageTestTs } from '../files/context-storage-test-ts'
import { contextStorageTs }     from '../files/context-storage-ts'
import { ENV_TS }               from '../files/env-ts'
import { STORAGES }             from '../storages'
import type { StorageName }     from '../storages'

export type StorageTemplateOptions = { backend: string, names: ContextNames, storage: StorageName, port: number }

/** The line of a context's file that makes its base without storage, and with it. */
export function baseLine({ folder, type }: ContextNames, withStorage: boolean): string {
  const storage = withStorage ? `, storage: await open${type}Storage(router)` : ''
  return `    const base = new ContextBase({ name: '${folder}', platform, database${storage} })`
}

/** Files for a context: its <ctx>-storage.ts, its variables, and its base given that storage. */
export function storageTemplate({ backend, names, storage, port }: StorageTemplateOptions): FileChange[] {
  const template = STORAGES[storage]
  const at = (path: string) => join(backend, path)
  const folder = at(join(CONTEXTS_FOLDER, names.folder))
  return [
    { action: 'create', path: join(folder, `${names.folder}-storage.ts`), content: contextStorageTs(names, template) },
    ...template.servesFiles ? [{ action: 'create', path: join(folder, `${names.folder}-storage.test.ts`), content: contextStorageTestTs(names) } as const] : [],
    ...template.imports.some(line => line.includes('requiredEnv')) ? [{ action: 'create', path: at('src/env.ts'), content: ENV_TS } as const] : [],
    { action: 'complete-env', path: at('.env'), variables: template.env(names, `http://localhost:${port}`) },
    { action: 'complete-env', path: at('.env.example'), variables: template.env(names, `http://localhost:${port}`) },
    { action: 'complete-env', path: at('.env.test'), variables: template.testEnv(names) },
    {
      action: 'replace-line',
      path: join(folder, `${names.folder}.context.ts`),
      line: baseLine(names, false),
      with: baseLine(names, true),
      imports: [`import { open${names.type}Storage } from './${names.folder}-storage'`],
    },
  ]
}
