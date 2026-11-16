import type { CodeToken } from '../code-tokens/code-tokens'

/** Where `searched` is in `tokens`, by their text; -1 when it is not. */
export function indexOfTokens(tokens: CodeToken[], searched: CodeToken[], from = 0): number {
  if (searched.length === 0) return -1
  for (let at = from; at + searched.length <= tokens.length; at++) {
    if (searched.every((token, offset) => tokens[at + offset]!.text === token.text)) return at
  }
  return -1
}
