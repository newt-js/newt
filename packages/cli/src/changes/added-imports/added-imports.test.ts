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
  expect(addedImports('const x = 1\n', ["import { b } from 'b'"])).toBe("import { b } from 'b'\nconst x = 1\n")
})
