export const CODE_POINT = new Set(['C', 'POSIX', 'ucs_basic', 'pg_c_utf8'])

export function codePoint(row: Record<string, unknown>): boolean {
  if (row.collation !== null && row.collation !== undefined) {
    return CODE_POINT.has(String(row.collation))
  }
  return row.provider === 'b' || (row.provider === 'c' && CODE_POINT.has(String(row.databaseCollation)))
}
