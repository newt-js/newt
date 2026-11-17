import type { ModuleNames } from '../../names/module-names/module-names'
import type { PieceNames }  from '../../names/piece-names/piece-names'

/** A service of a module: a function its use cases share, on the module's DTO when it has the schema newt writes. */
export function serviceTs(module: ModuleNames, service: PieceNames, hasSchema: boolean): string {
  const type = hasSchema ? `${module.type}DTO` : 'unknown'
  const imports = hasSchema ? `import type { ${module.type}DTO } from '../${module.folder}.schema'\n\n` : ''
  return `${imports}export function ${service.camel}(${module.module}: ${type}): ${type} {
  return ${module.module}
}
`
}
