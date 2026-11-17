import type { SqlToken } from '../sql-tokens/sql-tokens'
import { sqlTokens }     from '../sql-tokens/sql-tokens'

const TABLE_CONSTRAINTS = new Set(['CONSTRAINT', 'PRIMARY', 'UNIQUE', 'CHECK', 'FOREIGN'])

export function declaredCollations(createTable: string): { column: string, collation: string }[] {
  const definitions: SqlToken[][] = []
  let current: SqlToken[] | undefined
  for (const token of sqlTokens(createTable)) {
    if (!token.quoted && token.text === '(' && token.depth === 0) {
      if (definitions.length > 0) {
        break
      }
      definitions.push(current = [])
    } else if (current && !token.quoted && token.text === ')' && token.depth === 0) {
      break
    } else if (current && !token.quoted && token.text === ',' && token.depth === 1) {
      definitions.push(current = [])
    } else {
      current?.push(token)
    }
  }
  return definitions.flatMap(definition => {
    const [name, ...rest] = definition
    if (!name || (!name.quoted && TABLE_CONSTRAINTS.has(name.text.toUpperCase()))) {
      return []
    }
    return rest.flatMap((token, i) => {
      const next = rest[i + 1]
      return !token.quoted && token.depth === 1 && token.text.toUpperCase() === 'COLLATE' && next ? [{ column: name.text, collation: next.text }] : []
    })
  })
}
