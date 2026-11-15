import { criteriaTree } from '../criteria-tree/criteria-tree'
import { Criteria }     from '../criteria/criteria'
import { holds }        from '../holds/holds'

export function matches<Row>(row: Row, criteria: Criteria<Row> = {}): boolean {
  return holds(row as Record<string, unknown>, criteriaTree(criteria))
}
