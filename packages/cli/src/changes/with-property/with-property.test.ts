import { expect }        from 'bun:test'
import { test }          from 'bun:test'
import { default as ts } from 'typescript'
// --------------------------------------------------------
import { withProperty }  from './with-property'

function added(code: string): string {
  const source = ts.createSourceFile('f.ts', code, ts.ScriptTarget.Latest, true)
  const object = (source.statements[0] as ts.VariableStatement).declarationList.declarations[0]!.initializer as ts.ObjectLiteralExpression
  return withProperty(code, source, object, 'b')
}

test('on the line of the object, or on one of its own', () => {
  expect(added('const o = { a }\n')).toBe('const o = { a, b }\n')
  expect(added('const o = {\n  a,\n}\n')).toBe('const o = {\n  a,\n  b,\n}\n')
  expect(added('const o = {\n  a\n}\n')).toBe('const o = {\n  a,\n  b,\n}\n')
})

test('after the comment of the last property, which stays its own', () => {
  expect(added('const o = {\n  a, // why\n}\n')).toBe('const o = {\n  a, // why\n  b,\n}\n')
  expect(added('const o = {\n  a // why\n}\n')).toBe('const o = {\n  a, // why\n  b,\n}\n')
})

test('before the close, when the object closes on its last line', () => {
  expect(added('const o = { a,\n  c }\n')).toBe('const o = { a,\n  c,\n  b }\n')
})
