export function groupOf(node: unknown): unknown[] | null {
  if (node === null || typeof node !== 'object') {
    return null
  }
  const group = 'and' in node ? node.and : 'or' in node ? node.or : null
  return Array.isArray(group) ? group : null
}
