import type { ModuleNames } from '../../../names/module-names/module-names'
import { fitting }          from '../../fitted-call/fitted-call'

/** `export type <name> = <type>`, its type on a line of its own when it does not fit. */
const typeLine = (name: string, type: string) => fitting(`export type ${name} = ${type}`, `export type ${name} =\n  ${type}`)

export function schemaTs({ folder, type }: ModuleNames): string {
  return `import { defineFilter } from '@newt-js/core'
import { z } from 'zod'
import { ${type}Id } from './value-objects/${folder}-id'

export const ${type}Schema = z.object({
  id: ${type}Id.schema,
  name: z.string().trim().min(1).max(100),
  createdAt: z.string(),
  updatedAt: z.string(),
})

${fitting(`export const ${type}CreateSchema = ${type}Schema.pick({ name: true })`, `export const ${type}CreateSchema = ${type}Schema.pick({\n  name: true,\n})`, `export const ${type}CreateSchema =\n  ${type}Schema.pick({ name: true })`)}

export const ${type}Filter = defineFilter({
${fitting(`  id: { field: 'id', value: ${type}Id.schema, ops: ['eq', 'in'] },`, `  id: {\n    field: 'id',\n    value: ${type}Id.schema,\n    ops: ['eq', 'in'],\n  },`)}
  name: { field: 'name', value: z.string(), ops: ['eq', 'ieq'] },
}, { sort: ['name', 'createdAt'] })

${typeLine(`${type}DTO`, `z.infer<typeof ${type}Schema>`)}
${typeLine(`${type}CreateDTO`, `z.input<typeof ${type}CreateSchema>`)}
${typeLine(`${type}FilterDTO`, `z.input<typeof ${type}Filter.schema>`)}
${typeLine(`${type}SortDTO`, `z.input<typeof ${type}Filter.sortSchema>`)}
`
}
