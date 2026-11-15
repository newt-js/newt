import { z }           from 'zod'
// --------------------------------------------------------
import { Criteria }    from '../criteria/criteria'
import { FilterField } from './filter-field'
import { FilterInput } from './filter-input'
import { Sort }        from './sort'

export type Filter<Fields extends Record<string, FilterField>, Sortable extends string = never> = {
  readonly schema: z.ZodType<FilterInput<Fields>, FilterInput<Fields>>
  readonly sortSchema: z.ZodType<Sort<Sortable>, Sort<Sortable>>
  parse(input: unknown): FilterInput<Fields>
  parseSort(input: unknown): Sort<Sortable>
  toCriteria<Row>(filter: FilterInput<Fields>): Criteria<Row>
  toOrder<Row>(sort: Sort<Sortable> | undefined): { field: keyof Row & string, direction?: 'asc' | 'desc' }[] | undefined
  fieldOf(name: keyof Fields & string): string
}
