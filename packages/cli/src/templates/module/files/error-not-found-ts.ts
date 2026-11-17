import type { ModuleNames } from '../../../names/module-names/module-names'

export function errorNotFoundTs({ module, type, words }: ModuleNames): string {
  return `import { NotFoundError } from '@newt-js/core'

export class ${type}NotFound extends NotFoundError {
  readonly code = '${module}.not_found'

  constructor() {
    super('There is no such ${words}')
  }
}
`
}
