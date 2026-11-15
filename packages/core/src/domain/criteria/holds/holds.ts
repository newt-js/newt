import { CriteriaNode } from '../criteria/criteria-node'
import { passes }       from '../passes/passes'

export function holds(row: Record<string, unknown>, node: CriteriaNode): boolean {
  switch (node.kind) {
    case 'all': return node.of.every(each => holds(row, each))
    case 'any': return node.of.some(each => holds(row, each))
    case 'field': return passes(row[node.field] ?? null, node.condition)
  }
}
