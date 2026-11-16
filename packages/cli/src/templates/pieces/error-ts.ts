import type { ModuleNames } from '../../names/module-names/module-names'
import type { PieceNames }  from '../../names/piece-names/piece-names'
import { ERROR_KINDS }      from '../../options/error-kind-of/error-kind-of'
import type { ErrorKind }   from '../../options/error-kind-of/error-kind-of'

/** An error of a module, of a kind HTTP answers by its status, with a code of the module's: `order.already_paid`. */
export function errorTs(module: ModuleNames, error: PieceNames, kind: ErrorKind): string {
  const base = ERROR_KINDS[kind]
  const own = error.folder.startsWith(`${module.folder}-`) ? error.folder.slice(module.folder.length + 1) : error.folder
  const message = error.words[0]!.toUpperCase() + error.words.slice(1)
  return `import { ${base} } from '@newt-js/core'

export class ${error.type} extends ${base} {
  readonly code = '${module.module}.${own.replaceAll('-', '_')}'

  constructor() {
    super('${message}')
  }
}
`
}
