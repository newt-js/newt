import { groupOf } from '../group-of/group-of'

export function beyond(input: unknown, maxDepth: number, maxConditions: number): 'depth' | 'conditions' | null {
  const pending: { node: unknown, depth: number }[] = [{ node: input, depth: 0 }]
  let conditions = 0
  while (pending.length) {
    const { node, depth } = pending.pop()!
    const group = groupOf(node)
    if (!group?.length) {
      if (++conditions > maxConditions) {
        return 'conditions'
      }
      continue
    }
    if (depth + 1 > maxDepth) {
      return 'depth'
    }
    if (conditions + pending.length + group.length > maxConditions * (maxDepth + 1)) {
      return 'conditions'
    }
    for (const each of group) {
      pending.push({ node: each, depth: depth + 1 })
    }
  }
  return null
}
