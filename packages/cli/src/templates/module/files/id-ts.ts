import type { ModuleNames } from '../../../names/module-names/module-names'
import { fittedCall }       from '../../fitted-call/fitted-call'
import { fitting }          from '../../fitted-call/fitted-call'

export function idTs({ type }: ModuleNames): string {
  return `import { uuidFactory, type Uuid } from '@newt-js/core'

${fittedCall('', `export const ${type}Id = uuidFactory`, [`'${type}Id'`])}
${fitting(`export type ${type}Id = Uuid<'${type}Id'>`, `export type ${type}Id =\n  Uuid<'${type}Id'>`)}
`
}
