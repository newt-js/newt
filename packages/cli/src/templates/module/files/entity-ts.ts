import type { ModuleNames } from '../../../names/module-names/module-names'

export function entityTs({ folder, module, type }: ModuleNames): string {
  return `import { Entity, type EntityInput } from '@newt-js/core'
import { ${type}_Created } from './events/${folder}-created'
import { ${type}Schema, type ${type}DTO } from './${folder}.schema'

/** What \`create\` takes, already checked: the entity's own words, never a DTO. */
export type ${type}CreateProps = { name: string }

export class ${type} extends Entity<typeof ${type}Schema> {
  private constructor(input: EntityInput<${type}DTO>, isNew: boolean) {
    super(${type}Schema, input, isNew)
  }

  static fromDTO(dto: ${type}DTO & { version: number }): ${type} {
    return new ${type}(dto, false)
  }

  static create(props: ${type}CreateProps): ${type} {
    const ${module} = new ${type}(props, true)
    ${module}.trackEvent(new ${type}_Created({ id: ${module}.id, name: ${module}.data.name }))
    return ${module}
  }
}
`
}
