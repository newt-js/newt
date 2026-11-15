const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const LOWER = 'abcdefghijklmnopqrstuvwxyz'

export function ieqFoldingAToZ(column: string, next: () => string): string {
  return `translate(${column}, '${UPPER}', '${LOWER}') = translate(${next()}, '${UPPER}', '${LOWER}')`
}
