import { GuardTimeout }          from '../../../../domain/repository/transactions/guard-timeout/guard-timeout'
import { errorCode }             from '../../sql/dialect/error-code/error-code'
import { ieqFoldingAToZ }        from '../../sql/dialect/ieq-folding-a-to-z/ieq-folding-a-to-z'
import { MIGRATION_TABLES }      from '../../sql/dialect/odd-text/odd-text'
import { splitStatements }       from '../../sql/migrations/split-statements/split-statements'
import { JOB_COLUMNS }           from '../../sql/outbox/sql-outbox/sql-outbox'
import type { SqlServerDialect } from '../../sql/server/sql-server-dialect'
import { CODE_POINT }            from '../code-point/code-point'
import { codePoint }             from '../code-point/code-point'
import { compareRunAfter }       from '../compare-run-after/compare-run-after'
import { escapedKey }            from '../escaped-key/escaped-key'
import { quoteIdentifier }       from '../quote-identifier/quote-identifier'

const COLUMNS = `
  SELECT attname AS name, NOT (attnotnull OR typnotnull) AS nullable,
    coalesce(nullif(typbasetype, 0), atttypid) = 20 AS big,
    coalesce(nullif(typbasetype, 0), atttypid) IN (114, 3802) AS json,
    coalesce(nullif(typbasetype, 0), atttypid) = 16 AS boolean
  FROM pg_attribute JOIN pg_type ON pg_type.oid = atttypid
  WHERE attrelid = to_regclass($1) AND attnum > 0 AND NOT attisdropped`

export const postgresDialect: SqlServerDialect = {
  name: 'postgres',
  begin: ['BEGIN'],
  failedStatementAborts: true,
  param: n => `$${n}`,
  quote: quoteIdentifier,
  always: 'TRUE',
  never: 'FALSE',
  distinct: (column, param) => `${column} IS DISTINCT FROM ${param}`,
  ieq: ieqFoldingAToZ,
  boolean: value => value,
  nullsLast: true,
  json: param => `${param}::text::jsonb`,
  parsesJson: true,
  columns: async (run, table) => {
    const rows = await run(COLUMNS, [quoteIdentifier(table)])
    const which = (key: string) => new Set(rows.filter(row => row[key]).map(row => String(row.name)))
    return { all: new Set(rows.map(row => String(row.name))), nullable: which('nullable'), big: which('big'), json: which('json'), boolean: which('boolean') }
  },
  isCollision: error => errorCode(error) === '23505',
  collidingColumns: async error => {
    const key = /^Key \((.+?)\)=/.exec(String((error as { detail?: unknown } | null)?.detail ?? ''))?.[1]
    return !key || key.includes('(') ? [] : key.split(', ').map(column => column.replace(/^"(.*)"$/, '$1').replaceAll('""', '"'))
  },
  isConflict: error => ['40001', '40P01'].includes(errorCode(error)),
  changed: result => Number((result as { count?: number }).count ?? 0),
  committed: result => {
    if ((result as { command?: string }).command === 'ROLLBACK') {
      throw new Error('The transaction was rolled back, not committed: a statement in it failed, which spoils a Postgres transaction')
    }
  },
  rollsBackTransaction: () => false,
  lock: async (connection, keys, waitMs) => {
    const deadline = Date.now() + waitMs
    await connection.unsafe('SAVEPOINT newt_guard')
    try {
      const [{ previous }] = await connection.unsafe("SELECT current_setting('lock_timeout') AS previous") as [{ previous: string }]
      for (const key of keys) {
        const left = deadline - Date.now()
        if (left <= 0) {
          throw new GuardTimeout(keys, waitMs)
        }
        await connection.unsafe("SELECT set_config('lock_timeout', $1, true)", [`${Math.max(1, Math.floor(left))}ms`])
        await connection.unsafe('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [escapedKey(key)])
      }
      await connection.unsafe("SELECT set_config('lock_timeout', $1, true)", [previous])
      await connection.unsafe('RELEASE SAVEPOINT newt_guard')
    } catch (error) {
      await connection.unsafe('ROLLBACK TO SAVEPOINT newt_guard')
      await connection.unsafe('RELEASE SAVEPOINT newt_guard')
      if (errorCode(error) === '55P03') {
        throw new GuardTimeout(keys, waitMs)
      }
      throw error
    }
  },
  release: async () => {},
  migrationLock: async (run, key) => {
    await run('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [key])
  },
  forUpdate: ' FOR UPDATE',
  claim: (run, queues, limit, worker, leaseUntil, now) => run(`
    UPDATE newt_job SET status = 'running', locked_by = $1, locked_until = $2, attempts = attempts + 1, updated_at = $3
    WHERE id IN (
      SELECT id FROM newt_job
      WHERE queue IN (${queues.map((_, i) => `$${i + 5}`).join(', ')})
        AND ((status = 'pending' AND run_after <= $4) OR (status = 'running' AND locked_until < $4))
      ORDER BY run_after, id
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING ${JOB_COLUMNS.join(', ')}`, [worker, leaseUntil, now, now, ...queues]).then(rows => rows.sort((a, b) => compareRunAfter(a, b))),
  upsertQueue: `
    INSERT INTO newt_job_queue (name, event, attempts, created_at, last_seen_at) VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (name) DO UPDATE SET event = EXCLUDED.event, attempts = EXCLUDED.attempts, last_seen_at = EXCLUDED.last_seen_at`,
  statements: script => splitStatements(script, { dollarQuotes: true, nestedComments: true }),
  tableExists: async (run, table) => (await run('SELECT 1 AS found FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = $1', [table])).length > 0,
  oddText: async run => {
    const rows = await run(`
      SELECT c.table_name AS "table", c.column_name AS "column", c.collation_name AS "collation", c.udt_name = 'citext' AS "citext", d.datcollate AS "databaseCollation", coalesce(to_jsonb(d) ->> 'datlocale', to_jsonb(d) ->> 'daticulocale') AS "databaseLocale", d.datlocprovider AS "provider"
      FROM information_schema.columns c CROSS JOIN pg_database d
      WHERE d.datname = current_database() AND c.table_schema = current_schema()
        AND (c.data_type IN ('text', 'character varying', 'character') OR c.udt_name = 'citext')
        AND c.table_name NOT IN (${MIGRATION_TABLES.map((_, i) => `$${i + 1}`).join(', ')})
      ORDER BY c.table_name, c.ordinal_position`, MIGRATION_TABLES)
    const indexed = await run(`
      SELECT t.relname AS "table", i.relname AS "index", co.collname AS "collation"
      FROM pg_index x
        JOIN pg_class i ON i.oid = x.indexrelid
        JOIN pg_class t ON t.oid = x.indrelid
        JOIN pg_namespace n ON n.oid = t.relnamespace
        CROSS JOIN LATERAL unnest(x.indcollation::oid[]) WITH ORDINALITY AS used(oid, position)
        JOIN pg_collation co ON co.oid = used.oid
      WHERE n.nspname = current_schema() AND co.collname <> 'default'
        AND t.relname NOT IN (${MIGRATION_TABLES.map((_, i) => `$${i + 1}`).join(', ')})
      ORDER BY t.relname, i.relname, used.position`, MIGRATION_TABLES)
    return [
      ...rows.filter(row => row.citext || !codePoint(row)).map(row => `${String(row.table)}.${String(row.column)} (${row.citext ? 'citext' : String(row.collation ?? `the database's ${String(row.provider === 'c' ? row.databaseCollation : row.databaseLocale)}`)})`),
      ...indexed.filter(row => !CODE_POINT.has(String(row.collation))).map(row => `${String(row.table)}.${String(row.index)} (${String(row.collation)})`),
    ]
  },
  textHint: 'Make them COLLATE "C", or create the database with LOCALE \'C\' (CREATE DATABASE … TEMPLATE template0 LOCALE \'C\') and leave them plain TEXT.',
}
