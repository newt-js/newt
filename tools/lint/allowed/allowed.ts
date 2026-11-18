export function allowed(from: string, to: string, test: boolean): boolean {
  if (test && to.startsWith('adapters/') && (!from.startsWith('adapters/') || from === 'adapters/http' || to.endsWith('/memory'))) return true
  if (from === 'domain') return false
  if (from === 'application') return to === 'domain'
  if (['adapters/database/postgres', 'adapters/database/mysql', 'adapters/database/sqlite'].includes(from) && to === 'adapters/database/sql') return true
  // An adapter of a port opens that port's memory adapter when a context keeps its data in memory, as its tests do.
  if (to.endsWith('/memory') && to.split('/')[1] === from.split('/')[1]) return true
  return to === 'domain' || to === 'application'
}
