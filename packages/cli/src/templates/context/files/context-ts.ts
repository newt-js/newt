import type { ContextNames }     from '../../../names/context-names/context-names'
import type { DatabaseTemplate } from '../databases'
import { baseLine }              from '../storage-template/storage-template'

export function contextTs(names: ContextNames, database: DatabaseTemplate): string {
  const { folder, type, camel } = names
  return `${database.imports.join('\n')}
import { BoundedContext, ContextBase, type Platform } from '@newt-js/core/application'
import { HttpRouter, type ContextToRun } from '@newt-js/core/http'
import { ${camel}Modules, type ${type}Modules } from './${folder}-modules'

export class ${type}_Context extends BoundedContext {
  private constructor(base: ContextBase, readonly modules: ${type}Modules) {
    super('${folder}', base)
  }

  static async open(platform: Platform): Promise<ContextToRun> {
    const database = ${database.open(names)}
    const router = new HttpRouter({ database })
${baseLine(names, false)}
    return { context: new ${type}_Context(base, ${camel}Modules(base, router)), router }
  }
}
`
}
