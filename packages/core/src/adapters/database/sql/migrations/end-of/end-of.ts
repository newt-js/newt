export function endOf(sql: string, close: string, from: number): number {
  const at = sql.indexOf(close, from)
  return at === -1 ? sql.length : at + close.length
}
