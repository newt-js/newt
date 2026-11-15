import { endOfNestedComment } from '../end-of-nested-comment/end-of-nested-comment'
import { endOfQuoted }        from '../end-of-quoted/end-of-quoted'
import { endOf }              from '../end-of/end-of'
import { followBlocks }       from '../follow-blocks/follow-blocks'
import { isEscapeString }     from '../is-escape-string/is-escape-string'
import { isNamePart }         from '../is-name-part/is-name-part'

export function splitStatements(sql: string, options: { dollarQuotes?: boolean, nestedComments?: boolean, backslashEscapes?: boolean, brackets?: boolean } = {}): string[] {
  const statements: string[] = []
  let start = 0
  let i = 0
  let previous = ';'
  let header = true
  let routine = false
  const blocks: boolean[] = []
  let tokens = false
  let depth = 0

  while (i < sql.length) {
    const char = sql[i]!
    const next = sql[i + 1]
    const tag = options.dollarQuotes && char === '$' && !isNamePart(sql[i - 1]) ? /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i))?.[0] : undefined

    if (/\s/.test(char)) {
      i++
      continue
    } else if (char === '-' && next === '-') {
      i = endOf(sql, '\n', i + 2)
      continue
    } else if (char === '/' && next === '*') {
      i = options.nestedComments ? endOfNestedComment(sql, i + 2) : endOf(sql, '*/', i + 2)
      continue
    } else if (char === "'" || char === '"' || char === '`') {
      const escapeString = (char !== '`' && options.backslashEscapes) || (char === "'" && isEscapeString(sql, i))
      i = endOfQuoted(sql, char, i + 1, escapeString)
    } else if (options.brackets && char === '[') {
      i = endOf(sql, ']', i + 1)
    } else if (tag) {
      i = endOf(sql, tag, i + tag.length)
    } else if (char === ';' && blocks.length === 0 && depth === 0) {
      if (tokens) statements.push(sql.slice(start, i).trim())
      start = ++i
      previous = ';'
      header = true
      routine = false
      tokens = false
      depth = 0
      continue
    } else if (isNamePart(char)) {
      const from = i
      while (isNamePart(sql[i])) i++
      const word = sql.slice(from, i).toLowerCase()
      tokens = true
      if (header) {
        header = previous === ';' ? word === 'create' : HEADER.has(word) || previous === '=' || previous === '@'
        if (!header && previous !== ';' && ROUTINES.has(word)) routine = true
      } else if (routine) {
        followBlocks(blocks, word, previous)
      }
      previous = word
      continue
    } else {
      if (char === '(') depth++
      else if (char === ')') depth = Math.max(0, depth - 1)
      i++
    }
    tokens = true
    previous = char
  }

  if (tokens) statements.push(sql.slice(start).trim())
  return statements
}

const HEADER = new Set(['or', 'replace', 'definer', 'current_user', 'constraint', 'temp', 'temporary'])

const ROUTINES = new Set(['trigger', 'procedure', 'function', 'event'])
