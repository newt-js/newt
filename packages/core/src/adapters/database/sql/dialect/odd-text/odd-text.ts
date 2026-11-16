import type { SqlDialect } from '../sql-dialect'
import type { SqlRun }     from '../sql-run'

export const MIGRATION_TABLES = ['newt_migrations', 'newt_framework_migrations']

export async function assertCodePointText(dialect: SqlDialect, run: SqlRun): Promise<void> {
  const odd = await dialect.oddText(run)
  if (odd.length > 0) {
    throw new Error(`Text in newt compares and sorts by code point, the same on every database, and these columns would not: ${odd.join(', ')}. ${dialect.textHint}`)
  }
}
