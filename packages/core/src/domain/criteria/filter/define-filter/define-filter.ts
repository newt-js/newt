import { z }             from 'zod'
// --------------------------------------------------------
import { Criteria }      from '../../criteria/criteria'
import { beyond }        from '../beyond/beyond'
import { Filter }        from '../filter'
import { FilterField }   from '../filter-field'
import { FilterInput }   from '../filter-input'
import { FilterLimits }  from '../filter-limits'
import { InvalidFilter } from '../invalid-filter/invalid-filter'
import { InvalidSort }   from '../invalid-sort/invalid-sort'
import { isNode }        from '../is-node/is-node'
import { issuesOf }      from '../issues-of/issues-of'
import { Sort }          from '../sort'

const MAX_IN = 100
const NEEDS_VALUE = 'A condition needs a value'

export function defineFilter<const Fields extends Record<string, FilterField>, const Sortable extends string = never>(
  fields: Fields,
  limits: FilterLimits<Sortable> = {},
): Filter<Fields, Sortable> {
  const maxDepth = limits.maxDepth ?? 3
  const maxConditions = limits.maxConditions ?? 20

  const leaves = Object.entries(fields).flatMap(([name, { value, ops }]) => {
    const plain = ops.filter(op => op !== 'in')
    return [
      ...(plain.length ? [z.strictObject({ field: z.literal(name), op: z.enum(plain as [string, ...string[]]), value })
        .refine(leaf => leaf.value !== undefined, { message: NEEDS_VALUE, path: ['value'] })] : []),
      ...(ops.includes('in') ? [z.strictObject({ field: z.literal(name), op: z.literal('in'), value: z.array(value).max(MAX_IN) })
        .refine(leaf => leaf.value.every(each => each !== undefined), { message: NEEDS_VALUE, path: ['value'] })] : []),
    ]
  })
  const node: z.ZodType = z.lazy(() => z.union([
    ...leaves,
    z.strictObject({ and: z.array(node).min(1) }),
    z.strictObject({ or: z.array(node).min(1) }),
  ] as unknown as [z.ZodType, z.ZodType, ...z.ZodType[]]))

  const tree = z.unknown().superRefine((input, context) => {
    const exceeded = beyond(input, maxDepth, maxConditions)
    if (exceeded === 'depth') {
      context.addIssue({ code: 'custom', message: `A filter nests at most ${maxDepth} groups deep` })
    }
    if (exceeded === 'conditions') {
      context.addIssue({ code: 'custom', message: `A filter has at most ${maxConditions} conditions` })
    }
  }).pipe(node)
  const equals = z.strictObject(Object.fromEntries(Object.entries(fields)
    .filter(([, { ops }]) => ops.includes('eq'))
    .map(([name, { value }]) => [name, value.optional()])))
  const schema = z.unknown().transform((input, context) => {
    const parsed = (input !== null && typeof input === 'object' && !isNode(input) ? equals : tree).safeParse(input)
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        context.addIssue({ code: 'custom', message: issue.message, path: issue.path })
      }
      return z.NEVER
    }
    return parsed.data
  }) as unknown as z.ZodType<FilterInput<Fields>, FilterInput<Fields>>
  const sortable = limits.sort ?? []
  const sortSchema = (sortable.length === 0
    ? z.array(z.never()).max(0)
    : z.array(z.strictObject({ field: z.enum(sortable as unknown as [string, ...string[]]), direction: z.enum(['asc', 'desc']).optional() })).max(3)) as unknown as z.ZodType<Sort<Sortable>, Sort<Sortable>>

  const toCriteria = (filter: Node): Record<string, unknown> => {
    if ('and' in filter) {
      return { and: filter.and.map(toCriteria) }
    }
    if ('or' in filter) {
      return { or: filter.or.map(toCriteria) }
    }
    return { [fields[filter.field]!.field]: { [filter.op]: filter.value } }
  }

  const fromEquals = (filter: Record<string, unknown>): Record<string, unknown> =>
    Object.fromEntries(Object.entries(filter).filter(([, value]) => value !== undefined).map(([name, value]) => [fields[name]!.field, value]))

  return {
    schema,
    sortSchema,
    parse: input => {
      const parsed = schema.safeParse(input)
      if (!parsed.success) {
        throw new InvalidFilter(issuesOf(parsed.error))
      }
      return parsed.data
    },
    parseSort: input => {
      const parsed = sortSchema.safeParse(input)
      if (!parsed.success) {
        throw new InvalidSort(issuesOf(parsed.error))
      }
      return parsed.data
    },
    toCriteria: <Row>(filter: FilterInput<Fields>) => (isNode(filter) ? toCriteria(filter as Node) : fromEquals(filter)) as Criteria<Row>,
    toOrder: <Row>(sort: Sort<string> | undefined) => sort?.length ? sort.map(({ field, direction }) => ({ field: field as keyof Row & string, ...(direction === undefined ? {} : { direction }) })) : undefined,
    fieldOf: name => fields[name]!.field,
  }
}

type Node = { and: Node[] } | { or: Node[] } | { field: string, op: string, value: unknown }
