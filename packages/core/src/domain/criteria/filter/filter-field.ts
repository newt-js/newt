import { z }             from 'zod'
// --------------------------------------------------------
import type { Operator } from '../criteria/operator'

export type FilterField = {
  field: string
  value: z.ZodType
  ops: readonly Operator[]
}
