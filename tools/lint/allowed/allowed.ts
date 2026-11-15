export function allowed(from: string, to: string, test: boolean): boolean {
  if (test && to.startsWith('adapters/') && (!from.startsWith('adapters/') || from === 'adapters/http' || to.endsWith('/memory'))) return true
  if (from === 'domain') return false
  if (from === 'application') return to === 'domain'
  if (['adapters/database/postgres', 'adapters/database/mysql', 'adapters/database/sqlite'].includes(from) && to === 'adapters/database/sql') return true
  return to === 'domain' || to === 'application'
}
