import type { ModuleNames } from '../../../names/module-names/module-names'
import { fittedCall }       from '../../fitted-call/fitted-call'

export function eventCreatedTs({ folder, name, type }: ModuleNames): string {
  return `import { defineEvent } from '@newt-js/core'
import { ${type}Schema } from '../${folder}.schema'

${fittedCall('', `export const ${type}_Created = defineEvent`, [`'${name}.created'`, `${type}Schema`])}
`
}
