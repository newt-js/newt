import type { ModuleNames } from '../../../names/module-names/module-names'

export function repositoryTs({ folder, type, table }: ModuleNames): string {
  return `import { Repository } from '@newt-js/core'
import type { ContextBase } from '@newt-js/core/application'
import { ${type} } from './${folder}'
import type { ${type}DTO } from './${folder}.schema'

export type ${type}Row = ${type}DTO & { version: number }

export class ${type}_Repository extends Repository<${type}, ${type}Row> {
  constructor(base: ContextBase) {
    super(base, base.database.records<${type}Row>('${table}'), { scope: 'none' })
  }

  protected toEntity(row: ${type}Row): ${type} {
    return ${type}.fromDTO(row)
  }
}
`
}
