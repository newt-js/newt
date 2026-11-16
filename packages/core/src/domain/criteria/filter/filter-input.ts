import type { FilterEquals } from './filter-equals'
import type { FilterField }  from './filter-field'
import type { FilterNode }   from './filter-node'

export type FilterInput<Fields extends Record<string, FilterField>> = FilterNode<Fields> | FilterEquals<Fields>
