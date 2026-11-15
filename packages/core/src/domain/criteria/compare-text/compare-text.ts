import { codePointRank } from '../code-point-rank/code-point-rank'

export function compareText(a: string, b: string): number {
  const length = Math.min(a.length, b.length)
  for (let i = 0; i < length; i++) {
    const x = a.charCodeAt(i)
    const y = b.charCodeAt(i)
    if (x !== y) {
      return codePointRank(x) - codePointRank(y)
    }
  }
  return a.length - b.length
}
