import { z }                from 'zod'
// --------------------------------------------------------
import type { FilterField } from './filter-field'

export type FilterEquals<Fields extends Record<string, FilterField>> = {
  [K in keyof Fields & string]?: 'eq' extends Fields[K]['ops'][number] ? z.infer<Fields[K]['value']> : never
}
