import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { SEPARATOR }     from './sorted-imports'
import { sortedImports } from './sorted-imports'

test('one name a line, packages first, aligned at from', () => {
  const text = "import { z } from 'zod'\nimport { b, type A } from './b'\nimport { join } from 'node:path'\n\nexport const x = 1\n"
  expect(sortedImports('a.ts', text)).toBe([
    "import { join }   from 'node:path'",
    "import { z }      from 'zod'",
    SEPARATOR,
    "import type { A } from './b'",
    "import { b }      from './b'",
    '',
    'export const x = 1',
    '',
  ].join('\n'))
})

test('the farthest file first, then exports', () => {
  const text = "import type { T } from './t'\nimport { u } from '../u'\nexport type { V } from './v'\n"
  expect(sortedImports('a.ts', text)).toBe([
    "import { u }      from '../u'",
    "import type { T } from './t'",
    SEPARATOR,
    "export type { V } from './v'",
    '',
  ].join('\n'))
})

test('leaves what the lint would not fix', () => {
  const star = "import * as fs from 'node:fs'\nimport { a } from './a'\n"
  const commented = "import { b } from './b'\n// why\nimport { a } from './a'\n"
  const scattered = "import { b } from './b'\nconst c = 1\nimport { a } from './a'\n"
  expect(sortedImports('a.ts', star)).toBe(star)
  expect(sortedImports('a.ts', commented)).toBe(commented)
  expect(sortedImports('a.ts', scattered)).toBe(scattered)
})
