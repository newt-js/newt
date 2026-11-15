import { isNamePart } from '../is-name-part/is-name-part'

export function isEscapeString(sql: string, quote: number): boolean {
  return (sql[quote - 1] === 'E' || sql[quote - 1] === 'e') && !isNamePart(sql[quote - 2])
}
