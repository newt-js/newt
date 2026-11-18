import type { ContextNames } from '../../../names/context-names/context-names'

/** The line of <ctx>.context.ts that hands the context to run. */
export const contextToRun = ({ type, camel }: ContextNames) => `return { context: new ${type}_Context(base, ${camel}Features(base, router)), router, host }`

export function contextTs(names: ContextNames): string {
  const { folder, type, camel, env } = names
  return `import { join } from 'node:path'
import { BoundedContext, ContextBase, type Platform } from '@newt-js/core/application'
import { HttpRouter, type ContextToRun } from '@newt-js/core/http'
import { authenticate } from '../../auth'
import { openDatabase, openStorage, type Stores } from '../../stores'
import { ${camel}Features, type ${type}Features } from './${folder}-features'

const MIGRATIONS_FOLDER = join(import.meta.dir, 'migrations')

export class ${type}_Context extends BoundedContext {
  private constructor(base: ContextBase, readonly features: ${type}Features) {
    super('${folder}', base)
  }

  static async open(platform: Platform, stores: Stores): Promise<ContextToRun> {
    const database = await openDatabase('${folder}', MIGRATIONS_FOLDER, stores)
    const router = new HttpRouter({ prefix: '/${folder}/api', database })
    router.authenticateWith(authenticate)
    const host = Bun.env.${env}_HOST
    const base = new ContextBase({ name: '${folder}', platform, database, storage: await openStorage('${folder}', router, stores, host) })
    ${contextToRun(names)}
  }
}
`
}
