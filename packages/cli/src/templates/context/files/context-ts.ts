import type { ContextNames } from '../../../names/context-names/context-names'
import type { DatabaseKind } from '../../stores/store-databases'
import { STORE_DATABASES }   from '../../stores/store-databases'
import type { FilesKind }    from '../../stores/store-files'
import { STORE_FILES }       from '../../stores/store-files'

/** The line of <ctx>.context.ts that hands the context to run. */
export const CONTEXT_TO_RUN = 'return { context, router, host }'

export type ContextStores = { database: DatabaseKind, files: FilesKind }

/** The head of the initialize of <ctx>.context.ts: without the contexts it is opened with, and with them. */
export function contextInitializeHead({ type }: ContextNames, withUses: boolean): string {
  const uses = withUses ? `    uses: ${type}_Uses,\n` : ''
  return `  static initialize(\n    base: ContextBase,\n    router: HttpRouter,\n${uses}  ): ${type}_Context {`
}

/** The head of the open of <ctx>.context.ts: without the contexts it is opened with, and with them. */
export function contextOpenHead({ type }: ContextNames, withUses: boolean): string {
  const uses = withUses ? `    uses: ${type}_Uses,\n` : ''
  return `  static async open(\n    platform: Platform,\n    place: DataPlace,\n${uses}  ): Promise<ContextToRun & { context: ${type}_Context }> {`
}

/** The line of the open of <ctx>.context.ts that initializes it: without the contexts it is opened with, and with them. */
export const contextInitializeCall = ({ type }: ContextNames, withUses: boolean) => `    const context = ${type}_Context.initialize(base, router${withUses ? ', uses' : ''})`

/** The line of <ctx>.context.ts that opens the type of the contexts it is opened with. */
export const contextUsesHead = ({ type }: ContextNames) => `export type ${type}_Uses = {`

/** The line of <ctx>.context.ts that opens its class, above which goes the type of the contexts it is opened with. */
export const contextClassHead = ({ type }: ContextNames) => `export class ${type}_Context extends BoundedContext {`

export function contextTs(names: ContextNames, stores: ContextStores): string {
  const { folder, type, camel, env } = names
  const database = STORE_DATABASES[stores.database]
  const files = STORE_FILES[stores.files]
  return `import { join } from 'node:path'
import { BoundedContext, ContextBase, type DataPlace, type Platform } from '@newt-js/core/application'
import { ${database.adapter} } from '${database.from}'
import { ${files.adapter} } from '${files.from}'
import { HttpRouter, openData, type ContextToRun } from '@newt-js/core/http'
import { authenticate } from '../../auth'

const MIGRATIONS_FOLDER = join(import.meta.dir, 'migrations')

${contextClassHead(names)}
${contextInitializeHead(names, false)}
    return new ${type}_Context(base, {})
  }

  private constructor(
    base: ContextBase,
    features: {},
  ) {
    super('${folder}', base, features)
  }

${contextOpenHead(names, false)}
    const router = new HttpRouter({ prefix: '/${folder}/api' })
    router.authenticateWith(authenticate)
    const host = Bun.env.${env}_HOST
    const { database, storage } = await openData('${folder}', {
      database: { adapter: ${database.adapter}(), migrations: MIGRATIONS_FOLDER },
      files: ${files.adapter}(),
      router,
      place,
      host,
    })
    const base = new ContextBase({
      name: '${folder}',
      platform,
      database,
      storage,
    })
${contextInitializeCall(names, false)}
    ${CONTEXT_TO_RUN}
  }
}
`
}
