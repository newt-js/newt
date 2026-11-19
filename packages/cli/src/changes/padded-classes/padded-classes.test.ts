import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { paddedClasses } from './padded-classes'

test('a blank line inside a class at each end', () => {
  expect(paddedClasses('a.ts', 'export class A {\n  b = 1\n}\n')).toBe('export class A {\n\n  b = 1\n\n}\n')
  expect(paddedClasses('a.ts', 'class A {\n\n\n  b = 1\n\n\n}\n')).toBe('class A {\n\n  b = 1\n\n}\n')
})

test('an inner class too, and a class on one line left as it is', () => {
  const text = 'function f() {\n  return class {\n    b = 1\n  }\n}\nclass C { d = 1 }\nclass E {}\n'
  expect(paddedClasses('a.ts', text)).toBe('function f() {\n  return class {\n\n    b = 1\n\n  }\n}\nclass C { d = 1 }\nclass E {}\n')
})
