import type { ModuleNames } from '../../../names/module-names/module-names'

export function idTs({ type }: ModuleNames): string {
  return `import { uuidFactory, type Uuid } from '@newt-js/core'

export const ${type}Id = uuidFactory('${type}Id')
export type ${type}Id = Uuid<'${type}Id'>
`
}
