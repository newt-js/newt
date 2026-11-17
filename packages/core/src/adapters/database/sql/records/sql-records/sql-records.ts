import { criteriaTree }      from '../../../../../domain/criteria/criteria-tree/criteria-tree'
import type { Criteria }     from '../../../../../domain/criteria/criteria/criteria'
import { DuplicateValue }    from '../../../../../domain/errors/duplicate-value/duplicate-value'
import { StaleVersion }      from '../../../../../domain/errors/stale-version/stale-version'
import { holdsNul }          from '../../../../../domain/repository/holds-nul/holds-nul'
import type { FindOptions }  from '../../../../../domain/repository/records/find-options'
import type { NewRow }       from '../../../../../domain/repository/records/new-row'
import type { Records }      from '../../../../../domain/repository/records/records'
import type { RowCount }     from '../../../../../domain/repository/records/row-count'
import type { StoredRow }    from '../../../../../domain/repository/records/stored-row'
import { TextWithNul }       from '../../../../../domain/repository/text-with-nul/text-with-nul'
import type { SqlDialect }   from '../../dialect/sql-dialect'
import type { TableColumns } from '../../dialect/table-columns'
import { whereClause }       from '../../where/where-clause/where-clause'
import { columnName }        from '../column-name/column-name'
import { fieldName }         from '../field-name/field-name'
import type { SqlExecutor }  from '../sql-executor'

type Values = Record<string, unknown>

export type SchemaGeneration = { readonly generation: number }

export class SqlRecords<Row extends StoredRow> implements Records<Row> {

  private learning: Promise<TableColumns> | undefined
  private learnedAt = -1

  constructor(
    readonly name: string,
    private readonly executor: SqlExecutor,
    private readonly dialect: SqlDialect,
    private readonly schema: SchemaGeneration = { generation: 0 },
  ) {}

  async find(criteria?: Criteria<Row>, options: FindOptions<Row> = {}): Promise<Row[]> {
    if (options.limit !== undefined && !(Number.isInteger(options.limit) && options.limit >= 0)) {
      throw new Error(`A limit is a whole number, 0 or more: not ${options.limit}`)
    }
    const columns = await this.columns()
    const params: unknown[] = []
    const quote = (field: string) => this.dialect.quote(columnName(field))
    const order = (options.orderBy?.length ? options.orderBy : [{ field: 'id', direction: 'asc' as const }])
      .map(({ field, direction }) => this.ordered(quote(field), columnName(field), direction, columns))
      .join(', ')
    const limit = options.limit === undefined ? '' : ` LIMIT ${options.limit}`
    const rows = await this.executor.all(`SELECT * FROM ${this.table}${this.where(criteria, params, columns)} ORDER BY ${order}${limit}`, params)
    const learned = rows[0] && Object.keys(rows[0]).some(each => !columns.all.has(each)) ? await this.columns(true) : columns
    this.executor.read(this.name)
    return rows.map(row => this.decode(row, learned))
  }

  async count(criteria?: Criteria<Row>): Promise<number> {
    const columns = await this.columns()
    this.executor.read(this.name)
    const params: unknown[] = []
    const [row] = await this.executor.all(`SELECT COUNT(*) AS total FROM ${this.table}${this.where(criteria, params, columns)}`, params)
    return Number(row?.total ?? 0)
  }

  async countBy<K extends keyof Row & string>(criteria: Criteria<Row> | undefined, fields: readonly K[]): Promise<RowCount<Row, K>[]> {
    if (fields.length === 0) {
      throw new Error('A count by fields names at least one')
    }
    const columns = await this.columns()
    this.executor.read(this.name)
    const params: unknown[] = []
    const grouped = fields.map(field => this.dialect.quote(columnName(field))).join(', ')
    const ordered = fields.map(field => this.ordered(this.dialect.quote(columnName(field)), columnName(field), 'asc', columns)).join(', ')
    const counted = this.dialect.quote('#count')
    const rows = await this.executor.all(`SELECT ${grouped}, COUNT(*) AS ${counted} FROM ${this.table}${this.where(criteria, params, columns)} GROUP BY ${grouped} ORDER BY ${ordered}`, params)
    return rows.map(({ '#count': count, ...values }) => ({ ...this.decode(values, columns), count: Number(count) }) as RowCount<Row, K>)
  }

  async insert(row: NewRow<Row>): Promise<void> {
    const columns = await this.columns()
    const values = this.encode({ ...row, version: 1 }, columns)
    const names = Object.keys(values)
    await this.writing(async () => {
      await this.executor.run(
        `INSERT INTO ${this.table} (${names.map(name => this.dialect.quote(name)).join(', ')}) VALUES (${names.map((name, i) => this.param(name, i + 1, columns)).join(', ')})`,
        Object.values(values),
      )
    })
  }

  async update(id: string, version: number, changes: Partial<NewRow<Row>>): Promise<void> {
    const columns = await this.columns()
    const values = this.encode({ ...changes, version: version + 1 }, columns)
    delete values.id
    await this.writing(async () => {
      if (this.missing(id)) {
        throw new StaleVersion()
      }
      const names = Object.keys(values)
      const sets = names.map((name, i) => `${this.dialect.quote(name)} = ${this.param(name, i + 1, columns)}`).join(', ')
      const changed = await this.executor.run(
        `UPDATE ${this.table} SET ${sets} WHERE id = ${this.dialect.param(names.length + 1)} AND version = ${this.dialect.param(names.length + 2)}`,
        [...Object.values(values), id, version],
      )
      if (changed === 0) {
        throw new StaleVersion()
      }
    })
  }

  async delete(id: string, version: number): Promise<void> {
    await this.writing(async () => {
      const deleted = this.missing(id) ? 0 : await this.executor.run(`DELETE FROM ${this.table} WHERE id = ${this.dialect.param(1)} AND version = ${this.dialect.param(2)}`, [id, version])
      if (deleted === 0) {
        throw new StaleVersion()
      }
    })
  }

  async deleteMany(criteria: Criteria<Row>): Promise<number> {
    const columns = await this.columns()
    const params: unknown[] = []
    const where = this.where(criteria, params, columns)
    return this.writing(() => this.executor.run(`DELETE FROM ${this.table}${where}`, params))
  }

  private get table(): string {
    return this.dialect.quote(this.name)
  }

  private ordered(quoted: string, name: string, direction: 'asc' | 'desc' | undefined, columns: TableColumns): string {
    const descending = direction === 'desc'
    const mayBeNull = !columns.all.has(name) || columns.nullable.has(name)
    if (!this.dialect.nullsLast || !mayBeNull) {
      return `${quoted} ${descending ? 'DESC' : 'ASC'}`
    }
    return `${quoted} ${descending ? 'DESC NULLS LAST' : 'ASC NULLS FIRST'}`
  }

  private param(name: string, n: number, columns: TableColumns): string {
    return columns.json.has(name) && this.dialect.json ? this.dialect.json(this.dialect.param(n)) : this.dialect.param(n)
  }

  private writing<T>(fn: () => Promise<T>): Promise<T> {
    return this.executor.write(async () => {
      try {
        return await fn()
      } catch (error) {
        if (this.dialect.isCollision(error)) {
          const columns = await this.columns()
          const colliding = await this.dialect.collidingColumns(error, (sql, params) => this.executor.all(sql, params ?? []), this.name)
          throw new DuplicateValue(colliding.filter(name => columns.all.has(name)).map(fieldName))
        }
        throw error
      }
    })
  }

  private where(criteria: Criteria<Row> | undefined, params: unknown[], columns: TableColumns): string {
    const clause = whereClause(criteriaTree(criteria), this.dialect, {
      column: columnName,
      value: (name, operand) => this.encodeValue(columnName(name), operand, columns),
    }, params)
    return clause === this.dialect.always ? '' : ` WHERE ${clause}`
  }

  private columns(again = false): Promise<TableColumns> {
    if (again || this.learnedAt !== this.schema.generation) {
      this.learning = undefined
    }
    this.learnedAt = this.schema.generation
    this.learning ??= this.dialect.columns((sql, params) => this.executor.all(sql, params ?? []), this.name).then(columns => {
      if (columns.all.size === 0) {
        this.learning = undefined
      }
      return columns
    }, (error: unknown) => {
      this.learning = undefined
      throw error
    })
    return this.learning
  }

  private missing(id: string): boolean {
    return id.includes('\u0000')
  }

  private encode(row: Values, columns: TableColumns): Values {
    if (holdsNul(row)) {
      throw new TextWithNul()
    }
    return Object.fromEntries(Object.entries(row)
      .filter(([, value]) => value !== undefined)
      .map(([name, value]) => [columnName(name), this.encodeValue(columnName(name), value, columns)]))
  }

  private encodeValue(name: string, value: unknown, columns: TableColumns): unknown {
    if (value === null || value === undefined) {
      return null
    }
    if (columns.json.has(name) || (typeof value === 'object' && !(value instanceof Uint8Array))) {
      return JSON.stringify(value)
    }
    if (typeof value === 'boolean') {
      return this.dialect.boolean(value)
    }
    return value
  }

  private decode(row: Values, columns: TableColumns): Row {
    return Object.fromEntries(Object.entries(row).map(([name, value]) => {
      if (value === null || value === undefined) {
        return [fieldName(name), null]
      }
      if (columns.json.has(name)) {
        return [fieldName(name), this.dialect.parsesJson || typeof value !== 'string' ? value : JSON.parse(value)]
      }
      if (columns.boolean.has(name)) {
        return [fieldName(name), typeof value === 'boolean' ? value : Number(value) !== 0]
      }
      if (columns.big.has(name) || typeof value === 'bigint') {
        const number = Number(value)
        return [fieldName(name), Number.isSafeInteger(number) ? number : String(value)]
      }
      return [fieldName(name), value]
    })) as Row
  }
}
