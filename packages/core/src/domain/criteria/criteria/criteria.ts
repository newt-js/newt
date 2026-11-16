import type { Condition } from './condition'

export type Criteria<Row> = { [K in keyof Row]?: Row[K] | Condition<Row[K]> | undefined } & {
  and?: readonly Criteria<Row>[]
  or?: readonly Criteria<Row>[]
}
