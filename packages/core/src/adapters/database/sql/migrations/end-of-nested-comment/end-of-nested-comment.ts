export function endOfNestedComment(sql: string, from: number): number {
  let open = 1
  for (let i = from; i < sql.length - 1; i++) {
    if (sql[i] === '/' && sql[i + 1] === '*') { open++; i++ }
    else if (sql[i] === '*' && sql[i + 1] === '/') {
      i++
      if (--open === 0) return i + 1
    }
  }
  return sql.length
}
