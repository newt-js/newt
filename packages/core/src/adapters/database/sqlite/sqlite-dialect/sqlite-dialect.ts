import { MIGRATION_TABLES }   from '../../sql/dialect/odd-text/odd-text'
import { SqlDialect }         from '../../sql/dialect/sql-dialect'
import { splitStatements }    from '../../sql/migrations/split-statements/split-statements'
import { JOB_COLUMNS }        from '../../sql/outbox/sql-outbox/sql-outbox'
import { declaredCollations } from '../declared-collations/declared-collations'
import { declaredType }       from '../declared-type/declared-type'

const ODD_COLLATIONS = new Set(['NOCASE', 'RTRIM'])

export const sqliteDialect: SqlDialect = {
  name: 'sqlite',
  param: () => '?',
  quote: identifier => `"${identifier.replaceAll('"', '""')}"`,
  always: '1',
  never: '0',
  distinct: (column, param) => `${column} IS NOT ${param}`,
  ieq: (column, next) => `lower(${column}) = lower(${next()})`,
  boolean: value => (value ? 1 : 0),
  columns: async (run, table) => {
    const rows = await run('SELECT name, "notnull" AS required, type, pk FROM pragma_table_info(?)', [table])
    const which = (holds: (row: Record<string, unknown>) => boolean) => new Set(rows.filter(holds).map(row => String(row.name)))
    return {
      all: new Set(rows.map(row => String(row.name))),
      nullable: which(row => Number(row.required) === 0 && Number(row.pk) === 0),
      big: new Set(),
      json: which(row => declaredType(row).startsWith('JSON')),
      boolean: which(row => declaredType(row).startsWith('BOOL')),
    }
  },
  isCollision: error => ['SQLITE_CONSTRAINT_PRIMARYKEY', 'SQLITE_CONSTRAINT_UNIQUE'].includes(String((error as { code?: unknown } | null)?.code)),
  collidingColumns: async error => {
    const failed = /^UNIQUE constraint failed: (.+)$/.exec(String((error as { message?: unknown } | null)?.message ?? ''))?.[1]
    if (!failed || failed.startsWith('index ')) {
      return []
    }
    return failed.split(', ').map(column => column.slice(column.indexOf('.') + 1))
  },
  isConflict: () => false,
  forUpdate: '',
  claim: async (run, queues, limit, worker, leaseUntil, now) => (await run(`
    UPDATE newt_job SET status = 'running', locked_by = ?, locked_until = ?, attempts = attempts + 1, updated_at = ?
    WHERE id IN (
      SELECT id FROM newt_job
      WHERE queue IN (${queues.map(() => '?').join(', ')})
        AND ((status = 'pending' AND run_after <= ?) OR (status = 'running' AND locked_until < ?))
      ORDER BY run_after, id
      LIMIT ${limit}
    )
    RETURNING ${JOB_COLUMNS.join(', ')}`, [worker, leaseUntil, now, ...queues, now, now])).sort((a, b) => {
    const [x, y] = [String(a.run_after), String(b.run_after)]
    return x < y ? -1 : x > y ? 1 : String(a.id) < String(b.id) ? -1 : 1
  }),
  upsertQueue: `
    INSERT INTO newt_job_queue (name, event, attempts, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (name) DO UPDATE SET event = excluded.event, attempts = excluded.attempts, last_seen_at = excluded.last_seen_at`,
  statements: script => splitStatements(script, { brackets: true }),
  tableExists: async (run, table) => (await run("SELECT 1 AS found FROM sqlite_master WHERE type = 'table' AND name = ?", [table])).length > 0,
  oddText: async run => {
    const rows = await run("SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name")
    const odd = await Promise.all(rows.filter(row => !MIGRATION_TABLES.includes(String(row.name))).map(async row => {
      const table = String(row.name)
      const indexed = await run('SELECT il.name AS idx, ix.name AS col, ix.coll FROM pragma_index_list(?) il, pragma_index_xinfo(il.name) ix WHERE ix.key = 1 ORDER BY il.name, ix.seqno', [table])
      return [
        ...declaredCollations(String(row.sql ?? '')),
        ...indexed.map(each => ({ column: String(each.col ?? each.idx), collation: String(each.coll ?? '') })),
      ].filter(each => ODD_COLLATIONS.has(each.collation.toUpperCase())).map(each => `${table}.${each.column} (${each.collation.toUpperCase()})`)
    }))
    return [...new Set(odd.flat())]
  },
  textHint: 'Leave them as SQLite makes them (BINARY), with no COLLATE NOCASE nor RTRIM: for a comparison that ignores case, there is ieq.',
}
