const LINE = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^#\s]*))/

/** The values an env file defines, as Bun reads them: with export, quotes and comments. */
export function envValues(text: string): Map<string, string> {
  const values = new Map<string, string>()
  for (const line of text.split('\n')) {
    const match = LINE.exec(line)
    if (match) values.set(match[1]!, match[2] ?? match[3] ?? match[4] ?? '')
  }
  return values
}
