import { z }          from 'zod'
// --------------------------------------------------------
import { KnownError } from '../errors/known-error/known-error'

type ValueObject<Schema extends z.ZodType> = {
  readonly schema: Schema
  from(input: z.input<Schema>): z.output<Schema>
  tryFrom(input: unknown): z.output<Schema> | undefined
}

export function defineValueObject<Schema extends z.ZodType, Extra extends object = {}>(
  schema: Schema,
  invalid: (input: z.input<Schema>) => KnownError,
  extra: Extra = {} as Extra,
): ValueObject<Schema> & Extra {
  return {
    ...extra,
    schema,
    from(input: z.input<Schema>): z.output<Schema> {
      const parsed = schema.safeParse(input)
      if (!parsed.success) {
        throw invalid(input)
      }
      return parsed.data
    },
    tryFrom(input: unknown): z.output<Schema> | undefined {
      const parsed = schema.safeParse(input)
      return parsed.success ? parsed.data : undefined
    },
  }
}
