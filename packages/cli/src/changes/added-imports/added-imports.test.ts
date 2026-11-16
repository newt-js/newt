import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { addedImports } from './added-imports'

test('adds the import after the last one', () => {
  expect(addedImports("import { a } from 'a'\n\nconst x = 1\n", ["import { b } from 'b'"])).toBe("import { a } from 'a'\nimport { b } from 'b'\n\nconst x = 1\n")
})

test('leaves out what the file imports already, from any line of that module', () => {
  const text = "import { a, type B } from 'a'\n"
  expect(addedImports(text, ["import { a } from 'a'", "import type { B } from 'a'"])).toBe(text)
})

test('at the top of a file without imports', () => {
  expect(addedImports('const x = 1\n', ["import { b } from 'b'"])).toBe("import { b } from 'b'\n\nconst x = 1\n")
})

test('a name imported as a type that a value now needs is imported as a value', () => {
  expect(addedImports("import type { A, B } from 'a'\n", ["import { A } from 'a'"])).toBe("import { A, type B } from 'a'\n")
  expect(addedImports("import { type A, B } from 'a'\n", ["import { A } from 'a'"])).toBe("import { A, B } from 'a'\n")
})

test('refuses a name the file imports from another module', () => {
  expect(() => addedImports("import { A } from './x'\n", ["import { A } from './y'"])).toThrow("the file imports A from './x' already")
})

test('after a shebang, and past the comment of the last import', () => {
  expect(addedImports('#!/usr/bin/env bun\nconst x = 1\n', ["import { b } from 'b'"])).toBe("#!/usr/bin/env bun\nimport { b } from 'b'\n\nconst x = 1\n")
  expect(addedImports("import { a } from 'a' // why\n", ["import { b } from 'b'"])).toBe("import { a } from 'a' // why\nimport { b } from 'b'\n")
})
