import type { ModuleNames } from '../../../names/module-names/module-names'

export function repositoryTs({ folder, type, table }: ModuleNames): string {
  const head = `export class ${type}_Repository extends Repository<${type}, ${type}Row> {`
  const classHead = head.length <= 80
    ? head
    : `export class ${type}_Repository\n  extends Repository<${type}, ${type}Row> {`
  return `import { Repository, type ResolvedRow } from '@newt-js/core'
import type { ContextBase } from '@newt-js/core/application'
import type { z } from 'zod'
import { ${type} } from './${folder}'
import type { ${type}Schema } from './${folder}.schema'

type ${type}Fields = z.infer<typeof ${type}Schema>

export type ${type}Row = ${type}Fields & { version: number }

${classHead}
  constructor(base: ContextBase) {
    const records = base.database.records<${type}Row>('${table}')
    super(base, records, { scope: 'none' })
  }

  protected toEntity(
    row: ResolvedRow<${type}Row, ${type}>,
  ): ${type} {
    return ${type}.fromDTO(row)
  }
}
`
}
