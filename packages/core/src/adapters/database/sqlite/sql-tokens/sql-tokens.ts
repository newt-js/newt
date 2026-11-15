export type SqlToken = { text: string, quoted: boolean, depth: number }

const CLOSING: Record<string, string> = { '"': '"', '\'': '\'', '`': '`', '[': ']' }

export function sqlTokens(sql: string): SqlToken[] {
  const found: SqlToken[] = []
  let depth = 0
  let i = 0
  while (i < sql.length) {
    const char = sql[i]!
    const closing = CLOSING[char]
    if (closing) {
      let text = ''
      i++
      while (i < sql.length) {
        if (sql[i] === closing) {
          if (closing !== ']' && sql[i + 1] === closing) {
            text += closing
            i += 2
            continue
          }
          break
        }
        text += sql[i]
        i++
      }
      i++
      found.push({ text, quoted: true, depth })
    } else if (char === '(' || char === ')' || char === ',') {
      if (char === ')') {
        depth--
      }
      found.push({ text: char, quoted: false, depth })
      if (char === '(') {
        depth++
      }
      i++
    } else if (/\s/.test(char)) {
      i++
    } else if (sql.startsWith('--', i)) {
      i = sql.indexOf('\n', i) === -1 ? sql.length : sql.indexOf('\n', i)
    } else if (sql.startsWith('/*', i)) {
      i = sql.indexOf('*/', i) === -1 ? sql.length : sql.indexOf('*/', i) + 2
    } else {
      const word = /^[^\s(),"'`[]+/.exec(sql.slice(i))![0]
      found.push({ text: word, quoted: false, depth })
      i += word.length
    }
  }
  return found
}
