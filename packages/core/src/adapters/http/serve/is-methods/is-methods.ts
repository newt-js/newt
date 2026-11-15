const METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'CONNECT', 'TRACE'])

export function isMethods(route: unknown): route is Record<string, unknown> {
  if (typeof route !== 'object' || route === null || route instanceof Response || route instanceof Blob) {
    return false
  }
  const keys = Object.keys(route)
  return keys.length > 0 && keys.every(key => METHODS.has(key))
}
