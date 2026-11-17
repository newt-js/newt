/** The modules from `from` to `to` through what each uses, or null when `from` never reaches `to`. */
export function dependencyPath(graph: Map<string, string[]>, from: string, to: string, seen = new Set<string>()): string[] | null {
  if (from === to) return [to]
  if (seen.has(from)) return null
  seen.add(from)
  for (const next of graph.get(from) ?? []) {
    const rest = dependencyPath(graph, next, to, seen)
    if (rest) return [from, ...rest]
  }
  return null
}
