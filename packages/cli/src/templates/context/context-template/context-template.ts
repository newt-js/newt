import { join }               from 'node:path'
// --------------------------------------------------------
import type { FileChange }    from '../../../commands/command'
import type { ContextNames }  from '../../../names/context-names/context-names'
import { CONTEXTS_FOLDER }    from '../../../project/backend-contexts/backend-contexts'
import type { BackendStores } from '../../../project/backend-stores/backend-stores'
import { STORE_DATABASES }    from '../../stores/store-databases'
import { STORE_FILES }        from '../../stores/store-files'
import { contextModulesTs }   from '../files/context-modules-ts'
import { contextTs }          from '../files/context-ts'

export type ContextTemplateOptions = { backend: string, packageName: string, names: ContextNames, stores: BackendStores }

export const RETURN_CONTEXTS = '  return contexts'

/** A context in `backend`, on the backend's stores: its folder, its variables, and its place in src/contexts.ts. */
export function contextTemplate({ backend, packageName, names, stores }: ContextTemplateOptions): FileChange[] {
  const database = STORE_DATABASES[stores.database]
  const files = STORE_FILES[stores.files]
  const at = (path: string) => join(backend, path)
  const folder = at(join(CONTEXTS_FOLDER, names.folder))
  const variables = { ...database.contextEnv(names.env, names.folder, packageName), ...files.contextEnv(names.env, names.folder, packageName) }
  return [
    { action: 'create', path: join(folder, `${names.folder}.context.ts`), content: contextTs(names) },
    { action: 'create', path: join(folder, `${names.folder}-modules.ts`), content: contextModulesTs(names) },
    { action: 'create', path: join(folder, 'migrations/.gitkeep'), content: '' },
    { action: 'complete-env', path: at('.env'), variables },
    { action: 'complete-env', path: at('.env.example'), variables },
    { action: 'complete-env', path: at('.env.test'), variables: { ...database.contextTestEnv(names.env, names.folder, packageName), ...files.contextTestEnv(names.env, names.folder, packageName) } },
    {
      action: 'insert-lines',
      path: at('src/contexts.ts'),
      anchor: RETURN_CONTEXTS,
      position: 'before',
      lines: [`  contexts.push(await ${names.type}_Context.open(platform))`],
      imports: [`import { ${names.type}_Context } from './contexts/${names.folder}/${names.folder}.context'`],
    },
  ]
}
