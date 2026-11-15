import { afterAll }       from 'bun:test'
import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { it }             from 'bun:test'
import { mkdirSync }      from 'node:fs'
import { mkdtempSync }    from 'node:fs'
import { rmSync }         from 'node:fs'
import { writeFileSync }  from 'node:fs'
import { tmpdir }         from 'node:os'
import { join }           from 'node:path'
// --------------------------------------------------------
import { asRule }         from '../../testing/testing'
import { tester }         from '../../testing/testing'
import { assertUsesTree } from './context-imports'
import { contextImports } from './context-imports'

/** Writes `files` (path to code) under `folder`. */
function write(folder: string, files: Record<string, string>) {
  for (const [path, code] of Object.entries(files)) {
    mkdirSync(join(folder, path, '..'), { recursive: true })
    writeFileSync(join(folder, path), code)
  }
}

const CONTEXTS = { folder: 'src/contexts', uses: { auth: [], shop: ['auth'] } }
const CONTEXT = `${process.cwd()}/src/contexts`

tester.run('context-imports', asRule(contextImports), {
  valid: [
    { code: "import { x } from '../auth/auth.context'", filename: `${CONTEXT}/shop/shop.context.ts`, options: [CONTEXTS] },
    { code: "import { x } from '../shop/shop.module'", filename: `${CONTEXT}/auth/modules/user/user.module.ts`, options: [CONTEXTS] },
    { code: "import { x } from './modules/user/user.module'", filename: `${CONTEXT}/auth/auth.context.ts`, options: [CONTEXTS] },
  ],
  invalid: [
    ...["'../shop/shop.context'", "'./../shop/shop.context'", "'../../contexts/shop/shop.context'", "'../shop'"]
      .map(path => ({ code: `import { x } from ${path}`, filename: `${CONTEXT}/auth/auth.context.ts`, options: [CONTEXTS], errors: [{ messageId: 'other' }] })),
    { code: "const m = await import('../shop/shop.context')", filename: `${CONTEXT}/auth/auth.context.ts`, options: [CONTEXTS], errors: [{ messageId: 'other' }] },
    { code: "import { x } from '../shop/shop.context'", filename: `${CONTEXT}/billing/billing.context.ts`, options: [CONTEXTS], errors: [{ messageId: 'other' }] },
    // An absolute folder is the same folder.
    { code: "import { x } from '../shop/shop.context'", filename: `${CONTEXT}/auth/auth.context.ts`, options: [{ ...CONTEXTS, folder: CONTEXT }], errors: [{ messageId: 'other' }] },
  ],
})

// Files on disk, to tell the folder of a context from a file beside them when an import names it without its extension.
const PROJECT = mkdtempSync(join(tmpdir(), 'newt-lint-contexts-'))
afterAll(() => rmSync(PROJECT, { recursive: true, force: true }))
const FOLDER = join(PROJECT, 'contexts')
write(FOLDER, { 'registry.ts': '', 'names.ts': '', 'billing/index.ts': '', 'shop/shop.context.ts': '' })
const ON_DISK = { folder: FOLDER, uses: { auth: [], shop: ['auth'] } }

tester.run('context-imports, of files beside the contexts', asRule(contextImports), {
  valid: [
    { code: "import { x } from './names'", filename: join(FOLDER, 'registry.ts'), options: [ON_DISK] },
  ],
  invalid: [
    { code: "import { x } from '../registry'", filename: join(FOLDER, 'auth/auth.context.ts'), options: [ON_DISK], errors: [{ messageId: 'root' }] },
    { code: "import { x } from './shop/shop.context'", filename: join(FOLDER, 'registry.ts'), options: [ON_DISK], errors: [{ messageId: 'fromRoot' }] },
    { code: "import { x } from './shop'", filename: join(FOLDER, 'registry.ts'), options: [ON_DISK], errors: [{ messageId: 'fromRoot' }] },
    { code: "import { x } from '../billing'", filename: join(FOLDER, 'auth/auth.context.ts'), options: [ON_DISK], errors: [{ messageId: 'other', data: { path: '../billing', other: 'billing', context: 'auth', uses: 'no other context' } }] },
  ],
})

// Contexts whose code says what each uses: boards' context file imports auth's, and a cycle of two beside them.
const DECLARED = join(PROJECT, 'declared')
write(DECLARED, {
  'auth/auth.context.ts': 'export class Auth_Context {}\n',
  'boards/boards.context.ts': "import type { Auth_Context } from '../auth/auth.context'\nexport type Uses = Auth_Context\n",
  'boards/modules/card/card.module.ts': '',
  'notes/modules/note/note.module.ts': '',
})
const CYCLE = join(PROJECT, 'cycle')
write(CYCLE, { 'a/a.context.ts': "import '../b/b.context'\n", 'b/b.context.ts': "import '../a/a.context'\n" })

tester.run('context-imports, with what each context file imports', asRule(contextImports), {
  valid: [
    { code: "import { x } from '../../../auth/auth.context'", filename: join(DECLARED, 'boards/modules/card/card.module.ts'), options: [{ folder: DECLARED }] },
  ],
  invalid: [
    { code: "import { x } from '../boards/boards.context'", filename: join(DECLARED, 'auth/auth.context.ts'), options: [{ folder: DECLARED }], errors: [{ messageId: 'declared', data: { path: '../boards/boards.context', other: 'boards', context: 'auth', uses: 'no other context' } }] },
    // A context with no context file uses none.
    { code: "import { x } from '../../../auth/auth.context'", filename: join(DECLARED, 'notes/modules/note/note.module.ts'), options: [{ folder: DECLARED }], errors: [{ messageId: 'declared' }] },
    { code: '', filename: join(CYCLE, 'a/a.context.ts'), options: [{ folder: CYCLE }], errors: [{ messageId: 'tree', data: { problem: '@newt-js/lint: contexts never use each other in a cycle, and `uses` says a → b → a.' } }] },
  ],
})

describe('the contexts a preset says', () => {
  it('make a tree, of contexts it lists', () => {
    expect(() => assertUsesTree({ auth: [], shop: ['auth'], cs: ['auth', 'shop'] })).not.toThrow()
    expect(() => assertUsesTree({ auth: ['shop'], shop: ['auth'] })).toThrow('auth → shop → auth')
    expect(() => assertUsesTree({ auth: ['auth'] })).toThrow('auth → auth')
    expect(() => assertUsesTree({ shop: ['auth'] })).toThrow("the context 'shop' uses 'auth', which is not in `uses`")
  })
})
