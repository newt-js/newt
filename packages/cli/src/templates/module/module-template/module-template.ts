import { join }              from 'node:path'
// --------------------------------------------------------
import type { FileChange }   from '../../../commands/command'
import type { ContextNames } from '../../../names/context-names/context-names'
import type { ModuleNames }  from '../../../names/module-names/module-names'
import { CONTEXTS_FOLDER }   from '../../../project/backend-contexts/backend-contexts'
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

/** The line of <ctx>-modules.ts that initializes a module. */
export function initializedLine({ module, type }: ModuleNames, deps = ''): string {
  return `  const ${module} = ${type}_Module.initialize(base, router${deps})`
}

/** A module of a context: its files, its table's migration, and its place in <ctx>-modules.ts. */
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
    [`${names.folder}.routes.ts`]: routesTs(names, context.folder),
    [`${names.folder}.module.test.ts`]: moduleTestTs(names, context),
  }
  const sql = moduleMigration(names, database)
  const modules = join(contextFolder, `${context.folder}-modules.ts`)
  return [
    ...Object.entries(files).map(([path, content]): FileChange => ({ action: 'create', path: join(folder, path), content })),
    ...sql ? [
      { action: 'create', path: join(contextFolder, 'migrations', `${migration}_${names.table}_up.sql`), content: sql.up } as const,
      { action: 'create', path: join(contextFolder, 'migrations', `${migration}_${names.table}_down.sql`), content: sql.down } as const,
    ] : [],
    {
      action: 'wire-module',
      path: modules,
      module: names.module,
      declaration: initializedLine(names),
      imports: [`import { ${names.type}_Module } from './modules/${names.folder}/${names.folder}.module'`],
    },
  ]
}
