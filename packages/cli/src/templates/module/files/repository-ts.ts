import type { ModuleNames } from '../../../names/module-names/module-names'

export function repositoryTs({ folder, type, table }: ModuleNames): string {
  return `import { Repository, type ResolvedRow } from '@newt-js/core'
import type { ContextBase } from '@newt-js/core/application'
import type { z } from 'zod'
import { ${type} } from './${folder}'
import type { ${type}Schema } from './${folder}.schema'

/** What its table keeps: the ids of what it references, never the entities. */
export type ${type}Row = z.infer<typeof ${type}Schema> & { version: number }

export class ${type}_Repository extends Repository<${type}, ${type}Row> {
  constructor(base: ContextBase) {
    super(base, base.database.records<${type}Row>('${table}'), { scope: 'none' })
  }

  protected toEntity(row: ResolvedRow<${type}Row, ${type}>): ${type} {
    return ${type}.fromDTO(row)
  }
}
`
}
