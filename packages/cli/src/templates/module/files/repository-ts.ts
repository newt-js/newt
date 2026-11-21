import type { ModuleNames } from '../../../names/module-names/module-names'
import { fitting }          from '../../fitted-call/fitted-call'

export function repositoryTs({ folder, type, table }: ModuleNames): string {
  const classHead = fitting(
    `export class ${type}_Repository extends Repository<${type}, ${type}Row> {`,
    `export class ${type}_Repository\n  extends Repository<${type}, ${type}Row> {`,
    `export class ${type}_Repository extends Repository<\n  ${type},\n  ${type}Row\n> {`,
  )
  return `import { Repository, type ResolvedRow } from '@newt-js/core'
import type { ContextBase } from '@newt-js/core/application'
import type { z } from 'zod'
import { ${type} } from './${folder}'
import type { ${type}Schema } from './${folder}.schema'

${fitting(`type ${type}Fields = z.infer<typeof ${type}Schema>`, `type ${type}Fields =\n  z.infer<typeof ${type}Schema>`)}

${fitting(`export type ${type}Row = ${type}Fields & { version: number }`, `export type ${type}Row =\n  ${type}Fields & { version: number }`)}

${classHead}
  constructor(base: ContextBase) {
${fitting(`    const records = base.database.records<${type}Row>('${table}')`, `    const records = base.database.records<${type}Row>(\n      '${table}',\n    )`)}
    super(base, records, { scope: 'none' })
  }

  protected toEntity(
${fitting(`    row: ResolvedRow<${type}Row, ${type}>,`, `    row: ResolvedRow<\n      ${type}Row,\n      ${type}\n    >,`)}
  ): ${type} {
    return ${type}.fromDTO(row)
  }
}
`
}
