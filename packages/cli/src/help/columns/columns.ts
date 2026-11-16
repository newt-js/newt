export function columns(rows: [string, string][]): string[] {
  const width = Math.max(0, ...rows.map(([left]) => left.length))
  return rows.map(([left, right]) => `  ${left.padEnd(width)}  ${right}`)
}
