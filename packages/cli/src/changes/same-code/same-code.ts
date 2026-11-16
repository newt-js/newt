import { codeTokens } from '../code-tokens/code-tokens'

/** Whether two pieces of code are the same whatever their format. */
export function sameCode(one: string, other: string): boolean {
  const [a, b] = [codeTokens(one), codeTokens(other)]
  return a.length === b.length && a.every((token, at) => token.text === b[at]!.text)
}
