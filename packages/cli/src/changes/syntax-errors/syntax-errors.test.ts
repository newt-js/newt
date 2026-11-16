import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { syntaxErrors } from './syntax-errors'

test('a file that parses has none', () => {
  expect(syntaxErrors('a.ts', 'f(router, { supplier })\n')).toBe(0)
})

test('a double comma is one', () => {
  expect(syntaxErrors('a.ts', 'f(router,\n  , { supplier })\n')).toBeGreaterThan(0)
})

test('tsx is read as tsx', () => {
  expect(syntaxErrors('a.tsx', 'export const A = () => <div />\n')).toBe(0)
})

test('other files are not read', () => {
  expect(syntaxErrors('a.json', '{,}')).toBe(0)
})
