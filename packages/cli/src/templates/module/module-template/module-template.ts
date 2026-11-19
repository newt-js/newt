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

/** The line of <feature>.feature.ts that initializes a module. */
function initializedLine({ module, type }: ModuleNames, deps = ''): string {
  return `    const ${module} = ${type}_Module.initialize(base, router${deps})`
}

/** The line of the feature's index.ts that lets the other features use a module's DTOs. */
function dtosLines({ type, folder }: ModuleNames): string[] {
  const dtos = ['CreateDTO', 'DTO', 'FilterDTO', 'SortDTO']
  return dtos.map(dto => `export type { ${type}${dto} } from './${folder}/${folder}.schema'`)
}

/** A module of a feature: its files, its table's migration in its context's, its place in <feature>.feature.ts and its DTOs in the feature's index.ts. */
export function moduleTemplate({ backend, context, names, database, migration }: ModuleTemplateOptions): FileChange[] {
  const contextFolder = join(backend, CONTEXTS_FOLDER, context.folder)
  const featureFolder = join(contextFolder, 'features', names.feature.folder)
  const folder = join(featureFolder, names.folder)
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
  const entry = join(featureFolder, `${names.feature.folder}.feature.ts`)
  return [
    ...Object.entries(files).map(([path, content]): FileChange => ({ action: 'create', path: join(folder, path), content })),
    ...sql ? [
      { action: 'create', path: join(contextFolder, 'migrations', `${migration}_${names.migration}_up.sql`), content: sql.up } as const,
      { action: 'create', path: join(contextFolder, 'migrations', `${migration}_${names.migration}_down.sql`), content: sql.down } as const,
      { action: 'remove-unchanged', path: join(contextFolder, 'migrations/.gitkeep'), content: '', why: 'the folder has its migrations now' } as const,
    ] : [],
    {
      action: 'wire-module',
      path: entry,
      className: `${names.feature.type}_Feature`,
      name: names.module,
      type: `${names.type}_Module`,
      declaration: initializedLine(names),
      imports: [`import { ${names.type}_Module } from './${names.folder}/${names.folder}.module'`],
    },
    { action: 'ensure-lines', path: join(featureFolder, 'index.ts'), lines: dtosLines(names) },
  ]
}
