export function rank(path: string): [number, number, string] {
  if (!path.startsWith('.')) return [0, 0, path]
  const climbs = path.match(/^(\.\.\/)*/)![0].length / 3
  return [1, -climbs, path]
}
