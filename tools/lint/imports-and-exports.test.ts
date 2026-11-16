import { default as parser } from '@typescript-eslint/parser'
import { describe }          from 'bun:test'
import { it }                from 'bun:test'
import { RuleTester }        from 'eslint'
// --------------------------------------------------------
import { SEPARATOR }         from './imports-and-exports'
import { importsAndExports } from './imports-and-exports'

RuleTester.describe = describe
RuleTester.it = it
// Bun refuses it.only under CI as soon as it is read: read only when a case asks for it.
RuleTester.itOnly = (text: string, method: () => void) => it.only(text, method)

const tester = new RuleTester({ languageOptions: { parser } })
const lines = (...each: string[]) => each.join('\n')

tester.run('imports-and-exports', importsAndExports, {
  valid: [
    `import { a } from './a'`,
    lines(
      `import { a }      from 'bun:test'`,
      `import { z }      from 'bun:test'`,
      `import { b }      from 'zod'`,
      SEPARATOR,
      `import { c }      from '../../c'`,
      `import { d }      from '../a/d'`,
      `import type { E } from '../b/e'`,
      `import { f as g } from './f'`,
    ),
    lines(
      `import { z }                   from 'zod'`,
      SEPARATOR,
      `import { KnownError }          from '../known-error/known-error'`,
      SEPARATOR,
      `export { ConcurrencyConflict } from './concurrency-conflict/concurrency-conflict'`,
      ``,
      `const x = 1`,
    ),
    lines(`// a comment on the file`, ``, `export { a } from './a'`),
    lines(`export { a } from './a'`, `export *     from './errors'`),
  ],
  invalid: [
    {
      name: 'sorts by path: packages, then from the farthest up to the nearest',
      code: lines(`import { f } from './f'`, `import { c } from '../c'`, `import { a } from 'bun:test'`),
      output: lines(`import { a } from 'bun:test'`, SEPARATOR, `import { c } from '../c'`, `import { f } from './f'`),
      errors: [{ messageId: 'shape' }],
    },
    {
      name: 'puts one name per line, sorted by name',
      code: `import { test, describe, type Expect } from 'bun:test'`,
      output: lines(
        `import { describe }    from 'bun:test'`,
        `import { test }        from 'bun:test'`,
        `import { type Expect } from 'bun:test'`,
      ),
      errors: [{ messageId: 'shape' }],
    },
    {
      name: 'keeps an import of types one of types',
      code: `import type { B, A } from './x'`,
      output: lines(`import type { A } from './x'`, `import type { B } from './x'`),
      errors: [{ messageId: 'shape' }],
    },
    {
      name: 'puts a default import in braces',
      code: `import parser from 'parser'`,
      output: `import { default as parser } from 'parser'`,
      errors: [{ messageId: 'shape' }],
    },
    {
      name: 'puts imports first, then exports, with a separator, every from at one column',
      code: lines(`export { bcd } from './bcd'`, ``, `import { a } from './a'`),
      output: lines(`import { a }   from './a'`, SEPARATOR, `export { bcd } from './bcd'`),
      errors: [{ messageId: 'shape' }],
    },
    {
      name: 'separates exports from packages from local ones',
      code: lines(`export { a } from './a'`, `export { z } from 'zod'`),
      output: lines(`export { z } from 'zod'`, SEPARATOR, `export { a } from './a'`),
      errors: [{ messageId: 'shape' }],
    },
    {
      name: 'joins an import that spans lines',
      code: lines(`import {`, `  b,`, `} from './b'`, `import { a } from './a'`),
      output: lines(`import { a } from './a'`, `import { b } from './b'`),
      errors: [{ messageId: 'shape' }],
    },
    {
      name: 'leaves comments other than the separator for a person to fix',
      code: lines(`import { b } from './b' // why`, `import { a } from './a'`),
      output: null,
      errors: [{ messageId: 'shape' }],
    },
    {
      name: 'refuses another statement between imports and exports',
      code: lines(`import { a } from './a'`, `const x = 1`, `export { b } from './b'`),
      output: null,
      errors: [{ messageId: 'scattered' }],
    },
    {
      name: 'refuses a namespace export',
      code: `export * as errors from './errors'`,
      output: null,
      errors: [{ messageId: 'star' }],
    },
    {
      name: 'refuses a namespace import',
      code: `import * as path from 'node:path'`,
      output: null,
      errors: [{ messageId: 'star' }],
    },
  ],
})
