import { compare }        from '../compare/compare'
import type { Condition } from '../criteria/condition'
import type { Operator }  from '../criteria/operator'
import { lowerAscii }     from '../lower-ascii/lower-ascii'

export function passes(value: unknown, condition: Condition<unknown>): boolean {
  return Object.entries(condition).every(([operator, operand]) => {
    const comparable = value !== null && operand !== null
    switch (operator as Operator) {
      case 'eq': return value === operand
      case 'ne': return value !== operand
      case 'in': return (operand as unknown[]).includes(value)
      case 'gt': return comparable && compare(value, operand) > 0
      case 'gte': return comparable && compare(value, operand) >= 0
      case 'lt': return comparable && compare(value, operand) < 0
      case 'lte': return comparable && compare(value, operand) <= 0
      case 'ieq': return typeof value === 'string' && typeof operand === 'string' && lowerAscii(value) === lowerAscii(operand)
    }
  })
}
