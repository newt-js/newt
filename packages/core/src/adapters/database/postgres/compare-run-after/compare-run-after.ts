export function compareRunAfter(a: Record<string, unknown>, b: Record<string, unknown>): number {
  const [x, y] = [String(a.run_after), String(b.run_after)]
  return x < y ? -1 : x > y ? 1 : String(a.id) < String(b.id) ? -1 : 1
}
