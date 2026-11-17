import { GuardTimeout }          from '../../../../domain/repository/transactions/guard-timeout/guard-timeout'
import { errorCode }             from '../../sql/dialect/error-code/error-code'
import { MIGRATION_TABLES }      from '../../sql/dialect/odd-text/odd-text'
import { splitStatements }       from '../../sql/migrations/split-statements/split-statements'
import { JOB_COLUMNS }           from '../../sql/outbox/sql-outbox/sql-outbox'
import type { SqlServerDialect } from '../../sql/server/sql-server-dialect'
import { foldingAToZ }           from '../folding-a-to-z/folding-a-to-z'
import { pause }                 from '../pause/pause'

const COLUMNS = `
  SELECT COLUMN_NAME AS name, IS_NULLABLE = 'YES' AS nullable, DATA_TYPE AS type, COLUMN_TYPE AS columnType
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`

const GUARD_LOCK = "CONCAT('cg:', LEFT(SHA2(CONCAT(IFNULL(DATABASE(), ''), ':', ?), 256), 60))"

export const mysqlDialect: SqlServerDialect = {
  name: 'mysql',
  begin: ['SET TRANSACTION ISOLATION LEVEL READ COMMITTED', 'START TRANSACTION'],
  failedStatementAborts: false,
  param: () => '?',
  quote: identifier => `\`${identifier.replaceAll('`', '``')}\``,
  always: 'TRUE',
  never: 'FALSE',
  distinct: (column, param) => `NOT (${column} <=> ${param})`,
  ieq: (column, next) => `${foldingAToZ(column)} = ${foldingAToZ(next())}`,
  boolean: value => (value ? 1 : 0),
  parsesJson: true,
  columns: async (run, table) => {
    const rows = await run(COLUMNS, [table])
    const which = (holds: (row: Record<string, unknown>) => boolean) => new Set(rows.filter(holds).map(row => String(row.name)))
    return {
      all: new Set(rows.map(row => String(row.name))),
      nullable: which(row => Number(row.nullable) === 1),
      big: which(row => String(row.type).toLowerCase() === 'bigint'),
      json: which(row => String(row.type).toLowerCase() === 'json'),
      boolean: which(row => String(row.columnType).toLowerCase() === 'tinyint(1)'),
    }
  },
  isCollision: error => errorCode(error) === '1062',
  collidingColumns: async (error, run, table) => {
    const key = /for key '(?:[^'.]+\.)?([^']+)'$/.exec(String((error as { message?: unknown } | null)?.message ?? ''))?.[1]
    if (!key) {
      return []
    }
    const rows = await run('SELECT COLUMN_NAME AS name FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ? ORDER BY SEQ_IN_INDEX', [table, key])
    return rows.map(row => String(row.name))
  },
  isConflict: error => ['1213', '3058'].includes(errorCode(error)),
  changed: result => Number((result as { affectedRows?: number }).affectedRows ?? 0),
  committed: () => {},
  rollsBackTransaction: error => errorCode(error) === '1213',
  lock: async (connection, keys, waitMs) => {
    const deadline = Date.now() + waitMs
    const taken: string[] = []
    try {
      for (const key of keys) {
        for (;;) {
          const left = deadline - Date.now()
          const [row] = await connection.unsafe(`SELECT GET_LOCK(${GUARD_LOCK}, ?) AS got`, [key, Math.max(0, Math.floor(left / 1000))]) as { got: number }[]
          if (Number(row?.got) === 1) {
            taken.push(key)
            break
          }
          if (Date.now() >= deadline) {
            throw new GuardTimeout(keys, waitMs)
          }
          if (left < 1000) {
            await pause(Math.min(20, left))
          }
        }
      }
    } catch (error) {
      for (const key of taken) {
        await connection.unsafe(`SELECT RELEASE_LOCK(${GUARD_LOCK}) AS released`, [key]).catch(() => {})
      }
      throw error
    }
  },
  release: async connection => {
    await connection.unsafe('SELECT RELEASE_ALL_LOCKS()')
  },
  migrationLock: async (run, key) => {
    const [row] = await run("SELECT GET_LOCK(CONCAT('cm:', LEFT(SHA2(CONCAT(IFNULL(DATABASE(), ''), ':', ?), 256), 60)), -1) AS got", [key])
    if (Number(row?.got) !== 1) {
      throw new Error(`The lock on ${key} could not be taken`)
    }
  },
  forUpdate: ' FOR UPDATE',
  claim: async (run, queues, limit, worker, leaseUntil, now) => {
    const ready = await run(`
      SELECT id FROM newt_job
      WHERE queue IN (${queues.map(() => '?').join(', ')})
        AND ((status = 'pending' AND run_after <= ?) OR (status = 'running' AND locked_until < ?))
      ORDER BY run_after, id
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED`, [...queues, now, now])
    const ids = ready.map(row => row.id)
    if (ids.length === 0) {
      return []
    }
    const among = ids.map(() => '?').join(', ')
    await run(`UPDATE newt_job SET status = 'running', locked_by = ?, locked_until = ?, attempts = attempts + 1, updated_at = ? WHERE id IN (${among})`, [worker, leaseUntil, now, ...ids])
    return run(`SELECT ${JOB_COLUMNS.join(', ')} FROM newt_job WHERE id IN (${among}) ORDER BY run_after, id`, ids)
  },
  upsertQueue: `
    INSERT INTO newt_job_queue (name, event, attempts, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?) AS fresh
    ON DUPLICATE KEY UPDATE event = fresh.event, attempts = fresh.attempts, last_seen_at = fresh.last_seen_at`,
  statements: script => splitStatements(script, { backslashEscapes: true }),
  tableExists: async (run, table) => (await run('SELECT 1 AS found FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?', [table])).length > 0,
  oddText: async run => {
    const rows = await run(`
      SELECT TABLE_NAME AS name, COLUMN_NAME AS col, COLLATION_NAME AS collation FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND COLLATION_NAME IS NOT NULL AND COLLATION_NAME <> 'utf8mb4_0900_bin'
        AND TABLE_NAME NOT IN (${MIGRATION_TABLES.map(() => '?').join(', ')})
      ORDER BY TABLE_NAME, ORDINAL_POSITION`, MIGRATION_TABLES)
    return rows.map(row => `${String(row.name)}.${String(row.col)} (${String(row.collation)})`)
  },
  textHint: 'Make them COLLATE utf8mb4_0900_bin, or create the database with it (CREATE DATABASE … CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_bin) and its tables take it.',
}
