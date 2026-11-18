import type { ContextNames } from '../../../names/context-names/context-names'

export function contextTs({ folder, type, camel }: ContextNames): string {
  return `import { join } from 'node:path'
import { BoundedContext, ContextBase, type Platform } from '@newt-js/core/application'
import { HttpRouter, type ContextToRun } from '@newt-js/core/http'
import { authenticate } from '../../auth'
import { openDatabase, openStorage, type Stores } from '../../stores'
import { ${camel}Modules, type ${type}Modules } from './${folder}-modules'

const MIGRATIONS_FOLDER = join(import.meta.dir, 'migrations')

export class ${type}_Context extends BoundedContext {
  private constructor(base: ContextBase, readonly modules: ${type}Modules) {
    super('${folder}', base)
  }

  static async open(platform: Platform, stores: Stores): Promise<ContextToRun> {
    const database = await openDatabase('${folder}', MIGRATIONS_FOLDER, stores)
    const router = new HttpRouter({ prefix: '/${folder}/api', database })
    router.authenticateWith(authenticate)
    const base = new ContextBase({ name: '${folder}', platform, database, storage: await openStorage('${folder}', router, stores) })
    return { context: new ${type}_Context(base, ${camel}Modules(base, router)), router }
  }
}
`
}
