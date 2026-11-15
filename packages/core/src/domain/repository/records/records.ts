import { Criteria }    from '../../criteria/criteria/criteria'
import { FindOptions } from './find-options'
import { NewRow }      from './new-row'
import { RowCount }    from './row-count'
import { StoredRow }   from './stored-row'

export interface Records<Row extends StoredRow> {
  find(criteria?: Criteria<Row>, options?: FindOptions<Row>): Promise<Row[]>
  count(criteria?: Criteria<Row>): Promise<number>
  countBy<K extends keyof Row & string>(criteria: Criteria<Row> | undefined, fields: readonly K[]): Promise<RowCount<Row, K>[]>
  insert(row: NewRow<Row>): Promise<void>
  update(id: string, version: number, changes: Partial<NewRow<Row>>): Promise<void>
  delete(id: string, version: number): Promise<void>
  deleteMany(criteria: Criteria<Row>): Promise<number>
}
