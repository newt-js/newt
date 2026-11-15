export function isNode(filter: object): boolean {
  return 'and' in filter || 'or' in filter || 'field' in filter || 'op' in filter
}
