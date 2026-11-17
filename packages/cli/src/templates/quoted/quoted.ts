const ESCAPES: Record<string, string> = { '\\': '\\\\', '\'': '\\\'', '\n': '\\n', '\r': '\\r' }

/** A string literal in single quotes for generated code, whatever the text holds. */
export function quoted(text: string): string {
  return `'${[...text].map(char => ESCAPES[char] ?? char).join('')}'`
}
