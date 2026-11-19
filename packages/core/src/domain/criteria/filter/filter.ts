import { z }                from 'zod'
// --------------------------------------------------------
import type { Criteria }    from '../criteria/criteria'
import type { FilterField } from './filter-field'
import type { FilterInput } from './filter-input'
import type { Sort }        from './sort'

export type Filter<Fields extends Record<string, FilterField>, Sortable extends string = never> = {
  readonly schema: z.ZodType<FilterInput<Fields>, FilterInput<Fields>>
  readonly sortSchema: z.ZodType<Sort<Sortable>, Sort<Sortable>>
  parse(input: unknown): FilterInput<Fields>
  parseSort(input: unknown): Sort<Sortable>
  /** Parses the filter, as `parse` does, and gives the criteria of the repository's rows: their type is the one the call expects. */
  toCriteria<Row>(filter: FilterInput<Fields>): Criteria<Row>
  /** Parses the sort, as `parseSort` does, and gives the order of the repository's rows; none for no sort. */
  toOrder<Row>(sort: Sort<Sortable> | undefined): { field: keyof Row & string, direction?: 'asc' | 'desc' }[] | undefined
  fieldOf(name: keyof Fields & string): string
}
