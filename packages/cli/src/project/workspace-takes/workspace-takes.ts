/** Whether a monorepo's workspace patterns take a folder, given from the root: one pattern takes it and no `!` pattern leaves it out; never one in node_modules. */
export function workspaceTakes(patterns: string[], inRoot: string): 'taken' | 'left out' | 'not taken' {
  if (inRoot.split('/').includes('node_modules')) return 'not taken'
  const matches = (pattern: string) => new Bun.Glob(pattern.replace(/^\.\//, '').replace(/\/$/, '')).match(inRoot)
  if (patterns.some(pattern => pattern.startsWith('!') && matches(pattern.slice(1)))) return 'left out'
  return patterns.some(pattern => !pattern.startsWith('!') && matches(pattern)) ? 'taken' : 'not taken'
}
