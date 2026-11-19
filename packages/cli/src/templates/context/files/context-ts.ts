import type { ContextNames } from '../../../names/context-names/context-names'
import type { DatabaseKind } from '../../stores/store-databases'
import { STORE_DATABASES }   from '../../stores/store-databases'
import type { FilesKind }    from '../../stores/store-files'
import { STORE_FILES }       from '../../stores/store-files'

/** The line of <ctx>.context.ts that hands the context to run. */
export const contextToRun = ({ type }: ContextNames) => `return { context: ${type}_Context.initialize(base, router), router, host }`

export type ContextStores = { database: DatabaseKind, files: FilesKind }

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

/** ${folder}: its features, each one reached as ${camel}.<feature>. */
export class ${type}_Context extends BoundedContext {
  /** Builds its features, each after those it uses. */
  static initialize(base: ContextBase, router: HttpRouter): ${type}_Context {
    return new ${type}_Context(base, {})
  }

  private constructor(
    base: ContextBase,
    features: {},
  ) {
    super('${folder}', base, features)
  }

  static async open(platform: Platform, place: DataPlace): Promise<ContextToRun> {
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
    const base = new ContextBase({ name: '${folder}', platform, database, storage })
    ${contextToRun(names)}
  }
}
`
}
