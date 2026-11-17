import { Database as SqliteConnection } from 'bun:sqlite'
import type { SQLQueryBindings }        from 'bun:sqlite'
import { mkdir }                        from 'node:fs/promises'
import { rm }                           from 'node:fs/promises'
import { tmpdir }                       from 'node:os'
import { dirname }                      from 'node:path'
import { join }                         from 'node:path'
// --------------------------------------------------------
import type { Database }                from '../../../../application/database/database'
import { DuplicateValue }               from '../../../../domain/errors/duplicate-value/duplicate-value'
import type { Records }                 from '../../../../domain/repository/records/records'
import type { StoredRow }               from '../../../../domain/repository/records/stored-row'
import type { GuardOptions }            from '../../../../domain/repository/transactions/guard-options'
import type { SaveInProgress }          from '../../../../domain/repository/transactions/save-in-progress'
import { assertCodePointText }          from '../../sql/dialect/odd-text/odd-text'
import type { SqlRow }                  from '../../sql/dialect/sql-run'
import type { SqlRun }                  from '../../sql/dialect/sql-run'
import { databaseMigrations }           from '../../sql/migrations/database-migrations/database-migrations'
import type { Migrations }              from '../../sql/migrations/migrations'
import { SqlOutbox }                    from '../../sql/outbox/sql-outbox/sql-outbox'
import type { SqlExecutor }             from '../../sql/records/sql-executor'
import { SqlRecords }                   from '../../sql/records/sql-records/sql-records'
import { Lane }                         from '../../sql/transactions/lane/lane'
import { TransactionScope }             from '../../sql/transactions/transaction-scope/transaction-scope'
import type { TransactionSteps }        from '../../sql/transactions/transaction-scope/transaction-scope'
import { exactIntegers }                from '../exact-integers/exact-integers'
import { fileOf }                       from '../file-of/file-of'
import { sqliteConnection }             from '../sqlite-connection/sqlite-connection'
import type { SqliteDatabaseOptions }   from '../sqlite-database-options'
import { sqliteDialect }                from '../sqlite-dialect/sqlite-dialect'

const FRAMEWORK = join(import.meta.dir, '..', 'migrations')
const WAIT_TIMEOUT_MS = 30_000
const ROLLED_BACK = 'SQLite rolled the transaction back on its own, after an error inside it: nothing in it is stored'

const lanes = new Map<string, { lane: Lane, users: number }>()

export class SqliteDatabase implements Database {

  readonly outbox: SqlOutbox
  readonly migrations: Migrations

  private readonly scope: TransactionScope<undefined>
  private readonly schema = { generation: 0 }
  private readonly byName = new Map<string, SqlRecords<StoredRow>>()
  private closed = false

  private constructor(
    private readonly writer: SqliteConnection,
    private readonly reader: SqliteConnection,
    private readonly file: string,
    private readonly temporary: string | null,
    options: SqliteDatabaseOptions,
  ) {
    const shared = lanes.get(file) ?? { lane: new Lane(), users: 0 }
    shared.users++
    lanes.set(file, shared)
    this.scope = new TransactionScope<undefined>(true, options.waitTimeoutMs ?? WAIT_TIMEOUT_MS, shared.lane)
    const inTransaction = <T>(fn: (run: SqlRun) => Promise<T>) => this.run(() => fn((sql, params) => this.executor.all(sql, params ?? [])))
    this.outbox = new SqlOutbox(sqliteDialect, inTransaction, (sql, params) => this.executor.all(sql, params ?? []))
    const migrations = databaseMigrations({
      transaction: (_, fn) => this.migrating(fn),
      read: fn => fn(async (sql, params) => exactIntegers(this.reader.query(sql).all(...(params ?? []) as SQLQueryBindings[]) as SqlRow[])),
      statements: script => sqliteDialect.statements(script),
      param: n => sqliteDialect.param(n),
      quote: name => sqliteDialect.quote(name),
      tableExists: (run, table) => sqliteDialect.tableExists(run, table),
    }, FRAMEWORK, options.migrations)
    const changing = <T>(fn: () => Promise<T>) => async () => {
      try {
        return await fn()
      } finally {
        this.schema.generation++
      }
    }
    this.migrations = {
      up: () => changing(() => migrations.up())(),
      down: () => changing(() => migrations.down())(),
      status: () => migrations.status(),
    }
  }

  static async open(options: SqliteDatabaseOptions): Promise<SqliteDatabase> {
    const database = await SqliteDatabase.connect(options)
    try {
      await database.migrations.up()
      await database.checkText()
    } catch (error) {
      await database.close()
      throw error
    }
    return database
  }

  static async connect(options: SqliteDatabaseOptions): Promise<SqliteDatabase> {
    const temporary = options.path === ':memory:' ? join(tmpdir(), `newt-sqlite-${crypto.randomUUID()}.db`) : null
    const path = temporary ?? options.path
    await mkdir(dirname(path), { recursive: true })
    const writer = sqliteConnection(path, false)
    return new SqliteDatabase(writer, sqliteConnection(path, true), fileOf(path), temporary, options)
  }

  checkText(): Promise<void> {
    return assertCodePointText(sqliteDialect, async (sql, params) => exactIntegers(this.reader.query(sql).all(...(params ?? []) as SQLQueryBindings[]) as SqlRow[]))
  }

  get inTransaction(): boolean {
    return this.scope.inTransaction
  }

  run<T>(fn: () => T | Promise<T>): Promise<T> {
    return this.told(() => this.scope.run(fn, () => this.start()))
  }

  save<T>(fn: (save: SaveInProgress) => Promise<T>): Promise<T> {
    return this.told(() => this.scope.save(fn, () => this.start()))
  }

  async guard(_keys: string[], _options?: GuardOptions): Promise<void> {
    this.scope.assertNotEnded()
    if (!this.scope.inTransaction) {
      throw new Error('A guard is taken inside a transaction')
    }
  }

  afterCommit(fn: () => void): void {
    this.scope.afterCommit(fn)
  }

  afterRollback(fn: () => void): void {
    this.scope.afterRollback(fn)
  }

  records<Row extends StoredRow>(name: string): Records<Row> {
    let records = this.byName.get(name)
    if (!records) {
      records = new SqlRecords<StoredRow>(name, this.executor, sqliteDialect, this.schema)
      this.byName.set(name, records)
    }
    return records as unknown as Records<Row>
  }

  async query(sql: string, params: unknown[] = []): Promise<SqlRow[]> {
    return this.scope.inTransaction ? this.executor.all(sql, params) : this.run(() => this.executor.all(sql, params))
  }

  async close(): Promise<void> {
    if (this.closed) {
      return
    }
    this.closed = true
    await this.scope.drain()
    this.reader.close()
    this.writer.close()
    const shared = lanes.get(this.file)
    if (shared && --shared.users === 0) {
      lanes.delete(this.file)
    }
    if (this.temporary) {
      await Promise.all(['', '-wal', '-shm'].map(suffix => rm(`${this.temporary}${suffix}`, { force: true })))
    }
  }

  private start(): { state: undefined, steps: TransactionSteps } {
    return {
      state: undefined,
      steps: {
        begin: () => {
          this.writer.run('BEGIN IMMEDIATE')
        },
        commit: () => {
          if (!this.writer.inTransaction) {
            throw new Error(ROLLED_BACK)
          }
          this.writer.run('COMMIT')
        },
        rollback: () => {
          if (this.writer.inTransaction) {
            this.writer.run('ROLLBACK')
          }
        },
      },
    }
  }

  private migrating<T>(fn: (run: SqlRun) => Promise<T>): Promise<T> {
    return this.scope.exclusive(async () => {
      const run: SqlRun = async (sql, params = []) => {
        const statement = this.writer.prepare(sql)
        try {
          return exactIntegers(statement.all(...params as SQLQueryBindings[]) as SqlRow[])
        } finally {
          statement.finalize()
        }
      }
      this.writer.run('BEGIN IMMEDIATE')
      try {
        const value = await fn(run)
        this.writer.run('COMMIT')
        return value
      } catch (error) {
        if (this.writer.inTransaction) {
          this.writer.run('ROLLBACK')
        }
        throw error
      }
    })
  }

  private async told<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      throw sqliteDialect.isCollision(error) ? new DuplicateValue() : error
    }
  }

  private on(): SqliteConnection {
    this.scope.assertNotEnded()
    if (!this.scope.inTransaction) {
      return this.reader
    }
    if (!this.writer.inTransaction) {
      throw new Error(ROLLED_BACK)
    }
    return this.writer
  }

  private readonly executor: SqlExecutor = {
    all: async (sql, params) => exactIntegers(this.on().query(sql).all(...params as SQLQueryBindings[]) as SqlRow[]),
    run: async (sql, params) => {
      if (!this.scope.inTransaction) {
        throw new Error('A write runs inside a transaction')
      }
      return Number(this.on().query(sql).run(...params as SQLQueryBindings[]).changes)
    },
    read: table => this.scope.reading(table),
    write: fn => (this.scope.inTransaction ? fn() : this.run(fn)),
  }
}
