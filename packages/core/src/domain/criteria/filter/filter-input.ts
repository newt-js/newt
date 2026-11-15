import { FilterEquals } from './filter-equals'
import { FilterField }  from './filter-field'
import { FilterNode }   from './filter-node'

export type FilterInput<Fields extends Record<string, FilterField>> = FilterNode<Fields> | FilterEquals<Fields>
