import { describe }  from 'bun:test'
import { expect }    from 'bun:test'
import { test }      from 'bun:test'
// --------------------------------------------------------
import { sqlTokens } from './sql-tokens'

describe('sqlTokens', () => {
  test('splits words and punctuation, marking how deep in parentheses each one is', () => {
    expect(sqlTokens('CREATE TABLE t (a TEXT, b INT)')).toEqual([
      { text: 'CREATE', quoted: false, depth: 0 },
      { text: 'TABLE', quoted: false, depth: 0 },
      { text: 't', quoted: false, depth: 0 },
      { text: '(', quoted: false, depth: 0 },
      { text: 'a', quoted: false, depth: 1 },
      { text: 'TEXT', quoted: false, depth: 1 },
      { text: ',', quoted: false, depth: 1 },
      { text: 'b', quoted: false, depth: 1 },
      { text: 'INT', quoted: false, depth: 1 },
      { text: ')', quoted: false, depth: 0 },
    ])
  })

  // -----

  test('reads every way SQLite quotes a name, undoubling a quote inside it', () => {
    expect(sqlTokens('"a""b" \'c\'\'d\' `e``f` [g]h]').map(token => [token.text, token.quoted])).toEqual([
      ['a"b', true],
      ['c\'d', true],
      ['e`f', true],
      ['g', true],
      ['h]', false],
    ])
  })

  // -----

  test('keeps a parenthesis or comma inside quotes as part of the name', () => {
    expect(sqlTokens('"a(b,c)"')).toEqual([{ text: 'a(b,c)', quoted: true, depth: 0 }])
  })

  // -----

  test('skips line and block comments, also one left open at the end', () => {
    expect(sqlTokens('a -- one\nb /* two */ c /* open').map(token => token.text)).toEqual(['a', 'b', 'c'])
    expect(sqlTokens('a -- to the end').map(token => token.text)).toEqual(['a'])
  })
})
