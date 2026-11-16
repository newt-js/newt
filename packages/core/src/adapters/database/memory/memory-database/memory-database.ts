import type { Database }      from '../../../../application/database/database'
import type { Records }       from '../../../../domain/repository/records/records'
import type { StoredRow }     from '../../../../domain/repository/records/stored-row'
import { MemoryOutbox }       from '../memory-outbox/memory-outbox'
import { MemoryRecords }      from '../memory-records/memory-records'
import { MemoryTransactions } from '../memory-transactions/memory-transactions'

export class MemoryDatabase extends MemoryTransactions implements Database {

  readonly outbox = new MemoryOutbox(this)
  private readonly byName = new Map<string, MemoryRecords<StoredRow>>()

  records<Row extends StoredRow>(name: string): Records<Row> {
    let records = this.byName.get(name)
    if (!records) {
      records = new MemoryRecords<StoredRow>(name, this)
      this.byName.set(name, records)
    }
    return records as unknown as Records<Row>
  }

  async close(): Promise<void> {}
}
