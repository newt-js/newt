import { join }              from 'node:path'
// --------------------------------------------------------
import type { FileChange }   from '../../../commands/command'
import type { ContextNames } from '../../../names/context-names/context-names'
import { CONTEXTS_FOLDER }   from '../../../project/backend-contexts/backend-contexts'
import { DATABASES }         from '../databases'
import type { DatabaseName } from '../databases'
import { contextModulesTs }  from '../files/context-modules-ts'
import { contextTs }         from '../files/context-ts'
import { ENV_TS }            from '../files/env-ts'

export type ContextTemplateOptions = { backend: string, names: ContextNames, database: DatabaseName }

export const RETURN_CONTEXTS = '  return contexts'

/** A context in `backend`: its folder, its database's variables, and its place in src/contexts.ts. */
export function contextTemplate({ backend, names, database }: ContextTemplateOptions): FileChange[] {
  const template = DATABASES[database]
  const at = (path: string) => join(backend, path)
  const folder = at(join(CONTEXTS_FOLDER, names.folder))
  return [
    { action: 'create', path: join(folder, `${names.folder}.context.ts`), content: contextTs(names, template) },
    { action: 'create', path: join(folder, `${names.folder}-modules.ts`), content: contextModulesTs(names) },
    ...template.migrations ? [{ action: 'create', path: join(folder, 'migrations/.gitkeep'), content: '' } as const] : [],
    ...template.needsServer ? [{ action: 'create', path: at('src/env.ts'), content: ENV_TS } as const] : [],
    { action: 'complete-env', path: at('.env'), variables: template.env(names) },
    { action: 'complete-env', path: at('.env.example'), variables: template.env(names) },
    { action: 'complete-env', path: at('.env.test'), variables: template.testEnv(names) },
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
