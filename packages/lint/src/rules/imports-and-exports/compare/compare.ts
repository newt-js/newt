import { byText } from '../by-text/by-text'
import { rank }   from '../rank/rank'

export function compare(a: { path: string, name: string }, b: { path: string, name: string }): number {
  const [ga, ca, pa] = rank(a.path)
  const [gb, cb, pb] = rank(b.path)
  return ga - gb || ca - cb || byText(pa, pb) || byText(a.name, b.name)
}
