import type { ModuleNames } from '../../names/module-names/module-names'
import type { PieceNames }  from '../../names/piece-names/piece-names'
import { fittedCall }       from '../fitted-call/fitted-call'

/** An event of a module, defined by its name and the schema of its payload: its entity's DTO, when the module has the schema newt writes. */
export function eventTs(module: ModuleNames, event: PieceNames, hasSchema: boolean): string {
  const payload = hasSchema ? `${module.type}Schema` : 'z.object({ id: z.string() })'
  const imports = hasSchema ? `import { ${module.type}Schema } from '../${module.folder}.schema'` : "import { z } from 'zod'"
  return `import { defineEvent } from '@newt-js/core'
${imports}

${fittedCall('', `export const ${module.type}_${event.type} = defineEvent`, [`'${module.name}.${event.camel}'`, payload])}
`
}
