import { Criteria } from '../criteria/criteria'

export function allOf<Row>(a: Criteria<Row>, b: Criteria<Row>): Criteria<Row> {
  return { and: [a, b] } as Criteria<Row>
}
