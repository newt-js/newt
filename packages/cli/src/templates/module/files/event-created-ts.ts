import type { ModuleNames } from '../../../names/module-names/module-names'

export function eventCreatedTs({ folder, name, type }: ModuleNames): string {
  return `import { defineEvent } from '@newt-js/core'
import { ${type}Schema } from '../${folder}.schema'

export const ${type}_Created = defineEvent('${name}.created', ${type}Schema.pick({ id: true, name: true }))
`
}
