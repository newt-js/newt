import { compare }            from '../../../../domain/criteria/compare/compare'
import { Criteria }           from '../../../../domain/criteria/criteria/criteria'
import { matches }            from '../../../../domain/criteria/matches/matches'
import { DuplicateValue }     from '../../../../domain/errors/duplicate-value/duplicate-value'
import { StaleVersion }       from '../../../../domain/errors/stale-version/stale-version'
import { holdsNul }           from '../../../../domain/repository/holds-nul/holds-nul'
import { FindOptions }        from '../../../../domain/repository/records/find-options'
import { NewRow }             from '../../../../domain/repository/records/new-row'
import { Records }            from '../../../../domain/repository/records/records'
import { RowCount }           from '../../../../domain/repository/records/row-count'
import { StoredRow }          from '../../../../domain/repository/records/stored-row'
import { TextWithNul }        from '../../../../domain/repository/text-with-nul/text-with-nul'
import { MemoryTransactions } from '../memory-transactions/memory-transactions'

export class MemoryRecords<Row extends StoredRow> implements Records<Row> {

  private readonly rows = new Map<string, Row>()

  constructor(readonly name: string, private readonly transactions: MemoryTransactions, rows: Row[] = []) {
    for (const row of rows) {
      this.rows.set(row.id, structuredClone(row))
    }
  }

  async find(criteria?: Criteria<Row>, options: FindOptions<Row> = {}): Promise<Row[]> {
    if (options.limit !== undefined && !(Number.isInteger(options.limit) && options.limit >= 0)) {
      throw new Error(`A limit is a whole number, 0 or more: not ${options.limit}`)
    }
    const order = options.orderBy?.length ? options.orderBy : [{ field: 'id' as keyof Row & string }]
    const found = this.matching(criteria).sort((a, b) => {
      for (const { field, direction } of order) {
        const compared = compare(a[field] ?? null, b[field] ?? null)
        if (compared !== 0) {
          return direction === 'desc' ? -compared : compared
        }
      }
      return 0
    })
    return found.slice(0, options.limit).map(row => structuredClone(row))
  }

  async count(criteria?: Criteria<Row>): Promise<number> {
    return this.matching(criteria).length
  }

  async countBy<K extends keyof Row & string>(criteria: Criteria<Row> | undefined, fields: readonly K[]): Promise<RowCount<Row, K>[]> {
    if (fields.length === 0) {
      throw new Error('A count by fields names at least one')
    }
    const groups = new Map<string, RowCount<Row, K>>()
    for (const row of this.matching(criteria)) {
      const values = Object.fromEntries(fields.map(field => [field, row[field] ?? null])) as Pick<Row, K>
      const key = JSON.stringify(fields.map(field => row[field] ?? null))
      const group = groups.get(key) ?? { ...values, count: 0 }
      group.count++
      groups.set(key, group)
    }
    return [...groups.values()].sort((a, b) => {
      for (const field of fields) {
        const compared = compare(a[field], b[field])
        if (compared !== 0) {
          return compared
        }
      }
      return 0
    })
  }

  async insert(row: NewRow<Row>): Promise<void> {
    if (holdsNul(row)) {
      throw new TextWithNul()
    }
    await this.transactions.run(() => {
      if (this.row(row.id)) {
        throw new DuplicateValue(['id'])
      }
      this.set(row.id, { ...structuredClone(row), version: 1 } as Row)
    })
  }

  async update(id: string, version: number, changes: Partial<NewRow<Row>>): Promise<void> {
    if (holdsNul(changes)) {
      throw new TextWithNul()
    }
    await this.transactions.run(() => {
      const row = this.atVersion(id, version)
      const given = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined))
      this.set(id, { ...row, ...structuredClone(given), id, version: version + 1 })
    })
  }

  async delete(id: string, version: number): Promise<void> {
    await this.transactions.run(() => {
      this.atVersion(id, version)
      this.set(id, undefined)
    })
  }

  deleteMany(criteria: Criteria<Row>): Promise<number> {
    return this.transactions.run(() => {
      const doomed = this.matching(criteria)
      for (const row of doomed) {
        this.set(row.id, undefined)
      }
      return doomed.length
    })
  }

  private matching(criteria?: Criteria<Row>): Row[] {
    this.transactions.assertNotEnded()
    this.transactions.reading(this.name)
    const changes = this.changes()
    if (!changes?.size) {
      return [...this.rows.values()].filter(row => matches(row, criteria))
    }
    const rows = new Map(this.rows)
    for (const [id, row] of changes) {
      if (row) {
        rows.set(id, row)
      } else {
        rows.delete(id)
      }
    }
    return [...rows.values()].filter(row => matches(row, criteria))
  }

  private row(id: string): Row | undefined {
    const changes = this.changes()
    return changes?.has(id) ? changes.get(id) : this.rows.get(id)
  }

  private atVersion(id: string, version: number): Row {
    const row = this.row(id)
    if (!row || row.version !== version) {
      throw new StaleVersion()
    }
    return row
  }

  private changes(): Map<string, Row | undefined> | undefined {
    return this.transactions.staged(this, () => {
      const changes = new Map<string, Row | undefined>()
      return {
        changes,
        apply: () => {
          for (const [id, row] of changes) {
            if (row) {
              this.rows.set(id, row)
            } else {
              this.rows.delete(id)
            }
          }
        },
      }
    })?.changes
  }

  private set(id: string, row: Row | undefined): void {
    this.changes()!.set(id, row)
  }
}
