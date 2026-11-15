import { SqlRow } from '../../sql/dialect/sql-run'

export function exactIntegers(rows: SqlRow[]): SqlRow[] {
  return rows.map(row => Object.fromEntries(Object.entries(row).map(([name, value]) => {
    if (typeof value !== 'bigint') {
      return [name, value]
    }
    const number = Number(value)
    return [name, Number.isSafeInteger(number) ? number : String(value)]
  })))
}
