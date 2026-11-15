import { z } from 'zod'

export function optionalOnly(field: z.ZodType | undefined): boolean {
  return field !== undefined && field.safeParse(undefined).success && !field.safeParse(null).success
}
