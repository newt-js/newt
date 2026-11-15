import { ReservedSQL }              from 'bun'
import { SQL }                      from 'bun'
import { AsyncLocalStorage }        from 'node:async_hooks'
// --------------------------------------------------------
import { Database }                 from '../../../../../application/database/database'
import { DuplicateValue }           from '../../../../../domain/errors/duplicate-value/duplicate-value'
import { Records }                  from '../../../../../domain/repository/records/records'
import { StoredRow }                from '../../../../../domain/repository/records/stored-row'
import { GuardOptions }             from '../../../../../domain/repository/transactions/guard-options'
import { SaveInProgress }           from '../../../../../domain/repository/transactions/save-in-progress'
import { assertCodePointText }      from '../../dialect/odd-text/odd-text'
import { SqlRow }                   from '../../dialect/sql-run'
import { SqlRun }                   from '../../dialect/sql-run'
import { databaseMigrations }       from '../../migrations/database-migrations/database-migrations'
import { Migrations }               from '../../migrations/migrations'
import { SqlOutbox }                from '../../outbox/sql-outbox/sql-outbox'
import { SqlExecutor }              from '../../records/sql-executor'
import { SqlRecords }               from '../../records/sql-records/sql-records'
import { TransactionConflict }      from '../../transactions/transaction-conflict/transaction-conflict'
import { TransactionScope }         from '../../transactions/transaction-scope/transaction-scope'
import { TransactionSteps }         from '../../transactions/transaction-scope/transaction-scope'
import { SqlServerDatabaseOptions } from '../sql-server-database-options'
import { SqlServerDialect }         from '../sql-server-dialect'

type State = { connection?: ReservedSQL | undefined, turn: Promise<void>, rolledBack?: { cause: unknown } | undefined }

const WAIT_TIMEOUT_MS = 30_000

export class SqlServerDatabase implements Database {

  readonly outbox: SqlOutbox
  readonly migrations: Migrations

  private readonly scope: TransactionScope<State>
  private readonly holding = new AsyncLocalStorage<State>()
  private readonly schema = { generation: 0 }
  private readonly byName = new Map<string, SqlRecords<StoredRow>>()
  private savepoints = 0

  protected constructor(
    private readonly sql: SQL,
    private readonly dialect: SqlServerDialect,
    private readonly options: SqlServerDatabaseOptions,
    framework: string,
  ) {
    this.scope = new TransactionScope<State>(false, options.waitTimeoutMs ?? WAIT_TIMEOUT_MS)
    const inTransaction = <T>(fn: (run: SqlRun) => Promise<T>) => this.run(() => fn((text, params) => this.query(text, params)))
    this.outbox = new SqlOutbox(dialect, inTransaction, (text, params) => this.query(text, params))
    const migrations = databaseMigrations({
      transaction: (key, fn) => inTransaction(async run => {
        await dialect.migrationLock(run, key)
        return fn(run)
      }),
      read: fn => fn((text, params) => this.query(text, params)),
      statements: script => dialect.statements(script),
      param: n => dialect.param(n),
      quote: name => dialect.quote(name),
      tableExists: (run, table) => dialect.tableExists(run, table),
    }, framework, options.migrations)
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

  protected static pool(options: SqlServerDatabaseOptions): SQL {
    return new SQL({ url: options.url, max: options.connections ?? 10 })
  }

  checkText(): Promise<void> {
    return assertCodePointText(this.dialect, (text, params) => this.query(text, params))
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

  async guard(keys: string[], options: GuardOptions = {}): Promise<void> {
    this.scope.assertNotEnded()
    const state = this.scope.state
    if (!state) {
      throw new Error('A guard is taken inside a transaction')
    }
    await this.onConnection(state, connection => this.dialect.lock(connection, [...new Set(keys)].sort(), options.waitMs ?? this.options.waitTimeoutMs ?? WAIT_TIMEOUT_MS))
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
      records = new SqlRecords<StoredRow>(name, this.executor, this.dialect, this.schema)
      this.byName.set(name, records)
    }
    return records as unknown as Records<Row>
  }

  async query(text: string, params: unknown[] = []): Promise<SqlRow[]> {
    return [...await this.statement(text, params) as SqlRow[]]
  }

  async close(): Promise<void> {
    await this.sql.close()
  }

  private start(): { state: State, steps: TransactionSteps } {
    const state: State = { turn: Promise.resolve() }
    return {
      state,
      steps: {
        begin: async () => {
          const connection = state.connection = await this.sql.reserve()
          try {
            for (const statement of this.dialect.begin) {
              await connection.unsafe(statement)
            }
          } catch (error) {
            await connection.unsafe('ROLLBACK').catch(() => {})
            connection.release()
            state.connection = undefined
            throw error
          }
        },
        commit: () => this.inTurn(state, async connection => {
          this.assertNotRolledBack(state)
          this.dialect.committed(await connection.unsafe('COMMIT'))
        }),
        rollback: async () => {
          if (state.connection) {
            await this.inTurn(state, connection => connection.unsafe('ROLLBACK'))
          }
        },
        end: async () => {
          const connection = state.connection
          if (!connection) {
            return
          }
          try {
            await this.dialect.release(connection)
          } finally {
            connection.release()
          }
        },
      },
    }
  }

  private async told<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (error) {
      if (this.dialect.isCollision(error)) {
        throw new DuplicateValue()
      }
      if (this.dialect.isConflict(error)) {
        throw new TransactionConflict(error)
      }
      throw error
    }
  }

  private statement(text: string, params: unknown[]): Promise<unknown> {
    this.scope.assertNotEnded()
    const state = this.scope.state
    return state ? this.onConnection(state, connection => connection.unsafe(text, params)) : this.sql.unsafe(text, params)
  }

  private onConnection<T>(state: State, fn: (connection: ReservedSQL) => Promise<T>): Promise<T> {
    return this.inTurn(state, async connection => {
      this.scope.assertNotEnded()
      this.assertNotRolledBack(state)
      try {
        return await fn(connection)
      } catch (error) {
        if (this.dialect.rollsBackTransaction(error)) {
          state.rolledBack ??= { cause: error }
        }
        throw error
      }
    })
  }

  private assertNotRolledBack(state: State): void {
    if (state.rolledBack) {
      throw new TransactionConflict(state.rolledBack.cause)
    }
  }

  private async inTurn<T>(state: State, fn: (connection: ReservedSQL) => Promise<T>): Promise<T> {
    if (this.holding.getStore() === state) {
      return fn(state.connection!)
    }
    const before = state.turn
    let done!: () => void
    state.turn = new Promise(resolve => {
      done = resolve
    })
    try {
      await before
      return await this.holding.run(state, () => fn(state.connection!))
    } finally {
      done()
    }
  }

  private readonly executor: SqlExecutor = {
    all: (text, params) => this.query(text, params),
    run: async (text, params) => this.dialect.changed(await this.statement(text, params)),
    read: table => this.scope.reading(table),
    write: async fn => {
      this.scope.assertNotEnded()
      const state = this.scope.state
      if (!state) {
        return this.run(fn)
      }
      if (!this.dialect.failedStatementAborts) {
        return fn()
      }
      return this.onConnection(state, async connection => {
        const savepoint = `newt_write_${++this.savepoints}`
        await connection.unsafe(`SAVEPOINT ${savepoint}`)
        try {
          const result = await fn()
          await connection.unsafe(`RELEASE SAVEPOINT ${savepoint}`)
          return result
        } catch (error) {
          await connection.unsafe(`ROLLBACK TO SAVEPOINT ${savepoint}`)
          throw error
        }
      })
    },
  }
}
