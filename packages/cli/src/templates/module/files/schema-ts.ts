import type { ModuleNames } from '../../../names/module-names/module-names'

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

export const ${type}CreateSchema = ${type}Schema.pick({ name: true })

export const ${type}Filter = defineFilter({
  id: { field: 'id', value: ${type}Id.schema, ops: ['eq', 'in'] },
  name: { field: 'name', value: z.string(), ops: ['eq', 'ieq'] },
}, { sort: ['name', 'createdAt'] })

export type ${type}DTO = z.infer<typeof ${type}Schema>
export type ${type}CreateDTO = z.input<typeof ${type}CreateSchema>
export type ${type}FilterDTO = z.input<typeof ${type}Filter.schema>
export type ${type}SortDTO = z.input<typeof ${type}Filter.sortSchema>
`
}
