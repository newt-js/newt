type Named = { path: string, name: string }

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

function rank(path: string): [number, number, string] {
  if (!path.startsWith('.')) return [0, 0, path]
  const climbs = path.match(/^(\.\.\/)*/)![0].length / 3
  return [1, -climbs, path]
}

/** The order of newt's lint: packages, then local files, the farthest first, then by path and name. */
export function importOrder(a: Named, b: Named): number {
  const [ga, ca, pa] = rank(a.path)
  const [gb, cb, pb] = rank(b.path)
  return ga - gb || ca - cb || byText(pa, pb) || byText(a.name, b.name)
}
