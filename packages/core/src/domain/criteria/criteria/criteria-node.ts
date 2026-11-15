import { Condition } from './condition'

export type CriteriaNode =
  | { kind: 'all', of: CriteriaNode[] }
  | { kind: 'any', of: CriteriaNode[] }
  | { kind: 'field', field: string, condition: Condition<unknown> }
