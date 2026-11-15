export function prefixOf(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`A frontend's path starts with /: ${path}`)
  }
  return path.replace(/\/+$/, '')
}
