import type { Records }      from '../../domain/repository/records/records'
import type { StoredRow }    from '../../domain/repository/records/stored-row'
import type { Transactions } from '../../domain/repository/transactions/transactions'
import type { Outbox }       from './outbox/outbox'

export interface Database extends Transactions {
  readonly outbox: Outbox
  readonly inTransaction: boolean
  afterCommit(fn: () => void): void
  records<Row extends StoredRow>(name: string): Records<Row>
  close(): Promise<void>
}
