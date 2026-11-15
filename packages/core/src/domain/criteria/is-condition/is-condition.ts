import { Condition } from '../criteria/condition'
import { Operator }  from '../criteria/operator'

const OPERATORS = new Set<string>(['eq', 'ne', 'in', 'gt', 'gte', 'lt', 'lte', 'ieq'] satisfies Operator[])

export function isCondition(value: unknown): value is Condition<unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const prototype = Object.getPrototypeOf(value)
  if (prototype !== Object.prototype && prototype !== null) {
    return false
  }
  return Object.keys(value).every(key => OPERATORS.has(key))
}
