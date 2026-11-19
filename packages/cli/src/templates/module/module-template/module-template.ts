import { join }              from 'node:path'
// --------------------------------------------------------
import type { FileChange }   from '../../../commands/command'
import type { ContextNames } from '../../../names/context-names/context-names'
import type { ModuleNames }  from '../../../names/module-names/module-names'
import { CONTEXTS_FOLDER }   from '../../../project/backend-contexts/backend-contexts'
import { fittedCall }        from '../../fitted-call/fitted-call'
import { fitting }           from '../../fitted-call/fitted-call'
import type { DatabaseKind } from '../../stores/store-databases'
import { entityTs }          from '../files/entity-ts'
import { errorNotFoundTs }   from '../files/error-not-found-ts'
import { eventCreatedTs }    from '../files/event-created-ts'
import { idTs }              from '../files/id-ts'
import { moduleTestTs }      from '../files/module-test-ts'
import { moduleTs }          from '../files/module-ts'
import { repositoryTs }      from '../files/repository-ts'
import { routesTs }          from '../files/routes-ts'
import { schemaTs }          from '../files/schema-ts'
import { moduleMigration }   from '../migrations'

export type ModuleTemplateOptions = { backend: string, context: ContextNames, names: ModuleNames, database: DatabaseKind, migration: string }

/** The line of <ctx>.context.ts that initializes a module. */
function initializedLine({ module, type }: ModuleNames): string {
  return fitting(
    `    const ${module} = ${type}_Module.initialize(base, router)`,
    `    const ${module} =\n      ${type}_Module.initialize(base, router)`,
    fittedCall('    ', `const ${module} = ${type}_Module.initialize`, ['base', 'router']),
  )
}

/** A module of a context: its files, its table's migration in its context's, and its place, unpublished, in <ctx>.context.ts. */
export function moduleTemplate({ backend, context, names, database, migration }: ModuleTemplateOptions): FileChange[] {
  const contextFolder = join(backend, CONTEXTS_FOLDER, context.folder)
  const folder = join(contextFolder, 'modules', names.folder)
  const files: Record<string, string> = {
    [`value-objects/${names.folder}-id.ts`]: idTs(names),
    [`${names.folder}.schema.ts`]: schemaTs(names),
    [`events/${names.folder}-created.ts`]: eventCreatedTs(names),
    [`errors/${names.folder}-not-found.ts`]: errorNotFoundTs(names),
    [`${names.folder}.ts`]: entityTs(names),
    [`${names.folder}.repository.ts`]: repositoryTs(names),
    [`${names.folder}.module.ts`]: moduleTs(names),
    [`${names.folder}.routes.ts`]: routesTs(names),
    [`${names.folder}.module.test.ts`]: moduleTestTs(names, context, database),
  }
  const sql = moduleMigration(names, database)
  return [
    ...Object.entries(files).map(([path, content]): FileChange => ({ action: 'create', path: join(folder, path), content })),
    ...sql ? [
      { action: 'create', path: join(contextFolder, 'migrations', `${migration}_${names.migration}_up.sql`), content: sql.up } as const,
      { action: 'create', path: join(contextFolder, 'migrations', `${migration}_${names.migration}_down.sql`), content: sql.down } as const,
      { action: 'remove-unchanged', path: join(contextFolder, 'migrations/.gitkeep'), content: '', why: 'the folder has its migrations now' } as const,
    ] : [],
    {
      action: 'wire-module',
      path: join(contextFolder, `${context.folder}.context.ts`),
      className: `${context.type}_Context`,
      name: names.module,
      type: `${names.type}_Module`,
      declaration: initializedLine(names),
      imports: [`import { ${names.type}_Module } from './modules/${names.folder}/${names.folder}.module'`],
    },
  ]
}
