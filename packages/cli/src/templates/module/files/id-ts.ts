import type { ModuleNames } from '../../../names/module-names/module-names'

export function idTs({ type, words }: ModuleNames): string {
  return `import { uuidFactory, type Uuid } from '@newt-js/core'

/** A ${words}, by its id: what its use cases take, never a bare string. \`${type}Id.from(text)\` refuses anything but a UUID v7. */
export const ${type}Id = uuidFactory('${type}Id')
export type ${type}Id = Uuid<'${type}Id'>
`
}
