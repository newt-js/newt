import { default as ts } from 'typescript'

export type CodeToken = { text: string, start: number, end: number }

const { SyntaxKind: Kind } = ts

const CLOSING = new Set([Kind.CloseParenToken, Kind.CloseBracketToken, Kind.CloseBraceToken])

const ENDS_EXPRESSION = new Set([Kind.Identifier, Kind.NumericLiteral, Kind.StringLiteral, Kind.CloseParenToken, Kind.CloseBracketToken, Kind.CloseBraceToken, Kind.ThisKeyword])

/** Code as tokens that compare whatever its format: strings by their value, no `;`, no comma before a closing bracket or at the end, no parens around an arrow's one parameter. */
export function codeTokens(code: string): CodeToken[] {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, code)
  const tokens: (CodeToken & { kind: ts.SyntaxKind })[] = []
  const open: ('brace' | 'template')[] = []
  for (let kind = scanner.scan(); kind !== Kind.EndOfFileToken; kind = scanner.scan()) {
    if (kind === Kind.TemplateHead || kind === Kind.OpenBraceToken) open.push(kind === Kind.TemplateHead ? 'template' : 'brace')
    else if (kind === Kind.CloseBraceToken && open.pop() === 'template') {
      kind = scanner.reScanTemplateToken(false)
      if (kind === Kind.TemplateMiddle) open.push('template')
    } else if ((kind === Kind.SlashToken || kind === Kind.SlashEqualsToken) && !ENDS_EXPRESSION.has(tokens.at(-1)?.kind ?? Kind.Unknown)) {
      kind = scanner.reScanSlashToken()
    }
    if (kind === Kind.SemicolonToken) continue
    const string = kind === Kind.StringLiteral || kind === Kind.NoSubstitutionTemplateLiteral
    tokens.push({ kind, text: string ? JSON.stringify(scanner.getTokenValue()) : scanner.getTokenText(), start: scanner.getTokenStart(), end: scanner.getTokenEnd() })
  }
  const kindAt = (at: number) => tokens[at]?.kind
  const aroundParameter = (at: number) => kindAt(at) === Kind.OpenParenToken && kindAt(at + 1) === Kind.Identifier && kindAt(at + 2) === Kind.CloseParenToken && kindAt(at + 3) === Kind.EqualsGreaterThanToken
  const dropped = new Set(tokens.flatMap((_, at) => aroundParameter(at) ? [at, at + 2] : []))
  return tokens
    .filter((token, at) => !dropped.has(at) && (token.kind !== Kind.CommaToken || (at + 1 < tokens.length && !CLOSING.has(tokens[at + 1]!.kind))))
    .map(({ text, start, end }) => ({ text, start, end }))
}
