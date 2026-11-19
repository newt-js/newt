import type { ModuleNames } from '../../../names/module-names/module-names'
import { fittedCall }       from '../../fitted-call/fitted-call'
import { fitting }          from '../../fitted-call/fitted-call'

export function entityTs({ folder, module, type }: ModuleNames): string {
  return `import { Entity, type EntityInput } from '@newt-js/core'
import { ${type}_Created } from './events/${folder}-created'
import { ${type}Schema, type ${type}DTO } from './${folder}.schema'

export type ${type}CreateProps = { name: string }

${fitting(`export class ${type} extends Entity<typeof ${type}Schema> {`, `export class ${type}\n  extends Entity<typeof ${type}Schema> {`)}
${fitting(`  private constructor(input: EntityInput<${type}DTO>, isNew: boolean) {`, `  private constructor(\n    input: EntityInput<${type}DTO>,\n    isNew: boolean,\n  ) {`)}
    super(${type}Schema, input, isNew)
  }

${fitting(`  static fromDTO(dto: ${type}DTO & { version: number }): ${type} {`, `  static fromDTO(\n    dto: ${type}DTO & { version: number },\n  ): ${type} {`)}
    return new ${type}(dto, false)
  }

${fitting(`  static create(props: ${type}CreateProps): ${type} {`, `  static create(\n    props: ${type}CreateProps,\n  ): ${type} {`)}
${fitting(`    const ${module} = new ${type}(props, true)`, `    const ${module} =\n      new ${type}(props, true)`)}
${fitting(`    ${module}.trackEvent(new ${type}_Created(${module}.toDTO()))`, `${fittedCall('    ', `const created = new ${type}_Created`, [`${module}.toDTO()`])}\n    ${module}.trackEvent(created)`)}
    return ${module}
  }
}
`
}
