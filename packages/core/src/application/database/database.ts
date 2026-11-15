import { Records }      from '../../domain/repository/records/records'
import { StoredRow }    from '../../domain/repository/records/stored-row'
import { Transactions } from '../../domain/repository/transactions/transactions'
import { Outbox }       from './outbox/outbox'

export interface Database extends Transactions {
  readonly outbox: Outbox
  readonly inTransaction: boolean
  afterCommit(fn: () => void): void
  records<Row extends StoredRow>(name: string): Records<Row>
  close(): Promise<void>
}
