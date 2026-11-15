import { Condition }    from '../criteria/condition'
import { Criteria }     from '../criteria/criteria'
import { CriteriaNode } from '../criteria/criteria-node'
import { isCondition }  from '../is-condition/is-condition'

export function criteriaTree<Row>(criteria: Criteria<Row> = {}): CriteriaNode {
  const of: CriteriaNode[] = []
  for (const [field, criterion] of Object.entries(criteria)) {
    if (criterion === undefined) {
      continue
    }
    if (field === 'and') {
      of.push({ kind: 'all', of: (criterion as Criteria<Row>[]).map(each => criteriaTree(each)) })
    } else if (field === 'or') {
      of.push({ kind: 'any', of: (criterion as Criteria<Row>[]).map(each => criteriaTree(each)) })
    } else {
      const condition: Condition<unknown> = isCondition(criterion)
        ? Object.fromEntries(Object.entries(criterion).filter(([, operand]) => operand !== undefined))
        : { eq: criterion }
      if (Object.keys(condition).length > 0) {
        of.push({ kind: 'field', field, condition })
      }
    }
  }
  return of.length === 1 ? of[0]! : { kind: 'all', of }
}
