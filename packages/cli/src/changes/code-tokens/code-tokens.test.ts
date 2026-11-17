import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { indexOfTokens } from '../index-of-tokens/index-of-tokens'
import { sameCode }      from '../same-code/same-code'
import { codeTokens }    from './code-tokens'

describe('codeTokens', () => {
  test('quotes, semicolons, spaces and last commas do not count', () => {
    expect(sameCode(`contexts.push(await Sales_Context.open(platform))`, `contexts.push( await Sales_Context.open(platform) );`)).toBe(true)
    expect(sameCode(`define('order.purge', '0 3 * * *')`, `define("order.purge", "0 3 * * *")`)).toBe(true)
    expect(sameCode(`f(\n  a,\n  b,\n)`, `f(a, b)`)).toBe(true)
    expect(sameCode(`  { path: '/sales', app: x },`, `{ path: "/sales", app: x }`)).toBe(true)
    expect(sameCode(`on(e, created => [{ id: created.id }])`, `on(e, (created) => [\n  { id: created.id },\n]);`)).toBe(true)
  })

  test('other code is other code', () => {
    expect(sameCode(`f('a')`, `f('b')`)).toBe(false)
    expect(sameCode(`f(a, b)`, `f(a)`)).toBe(false)
  })

  test('templates and regular expressions are read whole', () => {
    expect(codeTokens('x = `a${b}c${d}e`; y = /}{/g').map(token => token.text)).toEqual(['x', '=', '`a${', 'b', '}c${', 'd', '}e`', 'y', '=', '/}{/g'])
  })

  test('finds a piece in a file, with its place', () => {
    const file = `const a = 1;\nreturn contexts;\n`
    const tokens = codeTokens(file)
    const at = indexOfTokens(tokens, codeTokens('  return contexts'))
    expect(file.slice(tokens[at]!.start, tokens[at + 1]!.end)).toBe('return contexts')
    expect(indexOfTokens(tokens, codeTokens('return other'))).toBe(-1)
  })
})
