import type { ContextNames } from '../../../names/context-names/context-names'

export function contextTs({ folder, type, camel }: ContextNames): string {
  return `import { join } from 'node:path'
import { BoundedContext, ContextBase, type Platform } from '@newt-js/core/application'
import { HttpRouter, type ContextToRun } from '@newt-js/core/http'
import { openDatabase, openStorage } from '../../stores'
import { ${camel}Modules, type ${type}Modules } from './${folder}-modules'

export class ${type}_Context extends BoundedContext {
  private constructor(base: ContextBase, readonly modules: ${type}Modules) {
    super('${folder}', base)
  }

  static async open(platform: Platform): Promise<ContextToRun> {
    const database = await openDatabase('${folder}', join(import.meta.dir, 'migrations'))
    const router = new HttpRouter({ database })
    const base = new ContextBase({ name: '${folder}', platform, database, storage: await openStorage('${folder}', router) })
    return { context: new ${type}_Context(base, ${camel}Modules(base, router)), router }
  }
}
`
}
