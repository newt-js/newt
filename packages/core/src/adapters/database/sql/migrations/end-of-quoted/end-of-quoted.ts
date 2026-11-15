export function endOfQuoted(sql: string, quote: string, from: number, escapes: boolean): number {
  for (let i = from; i < sql.length; i++) {
    if (escapes && sql[i] === '\\') i++
    else if (sql[i] === quote && sql[i + 1] === quote) i++
    else if (sql[i] === quote) return i + 1
  }
  return sql.length
}
