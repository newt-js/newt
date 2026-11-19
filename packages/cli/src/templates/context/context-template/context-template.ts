import { join }               from 'node:path'
// --------------------------------------------------------
import type { FileChange }    from '../../../commands/command'
import type { ContextNames }  from '../../../names/context-names/context-names'
import { CONTEXTS_FOLDER }    from '../../../project/backend-contexts/backend-contexts'
import type { BackendStores } from '../../../project/backend-stores/backend-stores'
import { AUTH_KEPT }          from '../../backend/files/src-auth-ts'
import { SRC_AUTH_TS }        from '../../backend/files/src-auth-ts'
import { STORE_DATABASES }    from '../../stores/store-databases'
import { STORE_FILES }        from '../../stores/store-files'
import { contextTs }          from '../files/context-ts'

export type ContextTemplateOptions = { backend: string, packageName: string, names: ContextNames, stores: Required<{ [K in keyof BackendStores]: NonNullable<BackendStores[K]> }>, migrated?: boolean }

const RETURN_CONTEXTS = '  return ['

/** The line of contexts.ts that opens a context, on lines of its own past 80 characters. */
export function openingLines({ camel, type }: ContextNames): string[] {
  const line = `  const ${camel} = await ${type}_Context.open(platform, place)`
  return line.length <= 80 ? [line] : [`  const ${camel} = await ${type}_Context.open(`, '    platform,', '    place,', '  )']
}

/** A context in `backend`, on the backend's stores: its folder, its variables, and its place in src/contexts/contexts.ts. */
export function contextTemplate({ backend, packageName, names, stores, migrated = false }: ContextTemplateOptions): FileChange[] {
  const database = STORE_DATABASES[stores.database]
  const files = STORE_FILES[stores.files]
  const at = (path: string) => join(backend, path)
  const folder = at(join(CONTEXTS_FOLDER, names.folder))
  const variables = { ...database.contextEnv(names.env, names.folder, packageName), ...files.contextEnv(names.env, names.folder, packageName) }
  return [
    { action: 'create', path: join(folder, `${names.folder}.context.ts`), content: contextTs(names, stores) },
    // Once it has a migration, add module removed it: the folder needs it no more.
    ...migrated ? [] : [{ action: 'create' as const, path: join(folder, 'migrations/.gitkeep'), content: '' }],
    { action: 'create', path: at('src/auth.ts'), content: SRC_AUTH_TS, kept: AUTH_KEPT },
    { action: 'complete-env', path: at('.env'), variables },
    { action: 'complete-env', path: at('.env.example'), variables },
    {
      action: 'insert-lines',
      path: at('src/contexts/contexts.ts'),
      anchor: RETURN_CONTEXTS,
      position: 'before',
      lines: openingLines(names),
      imports: [`import { ${names.type}_Context } from './${names.folder}/${names.folder}.context'`],
    },
    { action: 'add-returned-item', path: at('src/contexts/contexts.ts'), function: 'openContexts', item: names.camel },
  ]
}
