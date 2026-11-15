import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
// --------------------------------------------------------
import { isEscapeString } from './is-escape-string'

describe('isEscapeString', () => {
  test('a quote right after a lone E, in either case, opens an escape string', () => {
    expect(isEscapeString("SELECT E'a'", 8)).toBe(true)
    expect(isEscapeString("SELECT e'a'", 8)).toBe(true)
    expect(isEscapeString("E'a'", 1)).toBe(true)
  })

  test('an E that ends a longer name opens no escape string', () => {
    expect(isEscapeString("SELECT name'a'", 11)).toBe(false)
  })

  test('a quote after anything else opens a plain string', () => {
    expect(isEscapeString("SELECT 'a'", 7)).toBe(false)
  })
})
