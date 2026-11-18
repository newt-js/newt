import { afterAll }      from 'bun:test'
import { beforeAll }     from 'bun:test'
import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
import { ESLint }        from 'eslint'
import { mkdir }         from 'node:fs/promises'
import { mkdtemp }       from 'node:fs/promises'
import { rm }            from 'node:fs/promises'
import { writeFile }     from 'node:fs/promises'
import { tmpdir }        from 'node:os'
import { dirname }       from 'node:path'
import { join }          from 'node:path'
import { pathToFileURL } from 'node:url'
// --------------------------------------------------------
import { newt }          from './index'

let root: string
let eslint: ESLint

/** Lints one file of an application made with newt, and says which rules complain. */
async function complaints(path: string, code: string, linter = eslint): Promise<string[]> {
  await mkdir(dirname(join(root, path)), { recursive: true })
  await writeFile(join(root, path), code)
  const [result] = await linter.lintFiles([join(root, path)])
  return result?.messages.map(each => each.ruleId ?? each.message) ?? []
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'newt-lint-'))
  await writeFile(join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, module: 'ESNext', moduleResolution: 'bundler', paths: { '@/*': ['./src/*'] } }, include: ['**/*.ts'] }))
  eslint = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: newt({ contexts: { folder: 'src/contexts', uses: { auth: [], ws: ['auth'], cs: ['auth'] } } }) })
  // A module is a folder with its <module>.module.ts: these are the modules the tests write files in.
  for (const module of ['src/contexts/ws/features/sales/order', 'src/contexts/ws/features/sales/brand', 'src/contexts/ws/features/sales/transaction', 'src/contexts/ws/features/sales/folder', 'src/contexts/ws/features/sales/note', 'app/contexts/ws/features/sales/order']) {
    await mkdir(join(root, module), { recursive: true })
    await writeFile(join(root, module, `${module.split('/').at(-1)}.module.ts`), '')
  }
})

afterAll(() => rm(root, { recursive: true, force: true }))

describe('the preset of newt', () => {
  test('keeps contexts a tree', async () => {
    expect(await complaints('src/contexts/ws/ws.context.ts', "import { x } from '../cs/cs.context'\nexport const y = x\n")).toEqual(['newt/context-imports'])
    expect(await complaints('src/contexts/ws/ws.context.ts', "import { x } from '@/contexts/cs/cs.context'\nexport const y = x\n")).toEqual(['newt/context-imports'])
    expect(await complaints('src/contexts/ws/ws.context.ts', "import { x } from '../auth/auth.context'\nexport const y = x\n")).toEqual([])
  })

  test('reaches another feature only through its entry point, one its own entry point imports', async () => {
    const campaign = 'src/contexts/ws/features/campaigns/campaign/campaign.module.ts'
    await complaints('src/contexts/ws/features/contacts/contacts.feature.ts', 'export type ContactDTO = { id: string }\n')
    await complaints('src/contexts/ws/features/contacts/contact/contact.schema.ts', 'export type ContactDTO = { id: string }\n')
    await complaints('src/contexts/ws/features/campaigns/campaigns.feature.ts', "import type { ContactDTO } from '../contacts/contacts.feature'\nexport type C = ContactDTO\n")

    expect(await complaints(campaign, "import type { ContactDTO } from '../../contacts/contact/contact.schema'\nexport type C = ContactDTO\n")).toEqual(['newt/feature-imports'])
    expect(await complaints(campaign, "import type { ContactDTO } from '../../contacts/contacts.feature'\nexport type C = ContactDTO\n")).toEqual([])
    expect(await complaints('src/contexts/ws/features/contacts/contact/contact.module.ts', "import type { C } from '../../campaigns/campaigns.feature'\nexport type D = C\n")).toEqual(['newt/feature-imports'])
  })

  test('refuses contexts that are no tree', () => {
    expect(() => newt({ contexts: { folder: 'src/contexts', uses: { auth: ['shop'], shop: ['auth'] } } })).toThrow('auth → shop → auth')
    expect(() => newt({ contexts: { folder: 'src/contexts', uses: { shop: ['auth'] } } })).toThrow("uses 'auth', which is not in `uses`")
  })

  test("reads an alias of the tsconfig's paths as the file it names", async () => {
    expect(await complaints('src/contexts/ws/features/sales/order/order.module.ts', "import { x } from '@/contexts/ws/features/sales/brand/brand.repository'\nexport const y = x\n")).toEqual(['newt/module-imports'])
    expect(await complaints('src/contexts/ws/features/sales/order/order.deps.ts', "import type { x } from '@/contexts/ws/features/sales/brand/brand.module'\nexport type Y = typeof x\n")).toEqual([])
  })

  test('keeps a module writing through persist, never in a transaction of its own', async () => {
    const file = 'src/contexts/ws/features/sales/brand/brand.repository.ts'
    const base = 'interface Transactions { run(fn: () => void): Promise<void> }\ntype Base = { transactions: Transactions }\n'
    expect(await complaints(file, `${base}export const go = (base: Base) => base.transactions.run(() => {})\n`)).toEqual(['newt/module-transactions'])
    expect(await complaints(file, `${base}export const go = (base: Base) => base['transactions'].run(() => {})\n`)).toEqual(['newt/module-transactions'])
    expect(await complaints(file, `${base}export const go = (base: Base) => {\n  const { transactions } = base\n  return transactions.run(() => {})\n}\n`)).toEqual(['newt/module-transactions'])
  })

  test("a module's own field named transactions, as the repository of a module transaction, is no transaction", async () => {
    const file = 'src/contexts/ws/features/sales/transaction/transaction.module.ts'
    const code = 'class Transaction_Repository {\n  persist() {\n    return 1\n  }\n}\nexport class Transaction_Module {\n  private readonly transactions = new Transaction_Repository()\n  save() {\n    this.transactions.persist()\n  }\n}\n'
    expect(await complaints(file, code)).toEqual([])
  })

  test("judges a handler's callback by the types TypeScript gives, not by names", async () => {
    const workers = (calls: string) => [
      'class Order_Module {',
      '  events = { placed: { subscribe: (fn: (o: { id: string }) => unknown, s: object) => fn } }',
      '  fulfil(id: string) {',
      '    return id',
      '  }',
      '}',
      'type Order_Deps = { orders: { fulfil(id: string): void } }',
      'export function register(orders: Order_Module, deps: Order_Deps, untyped: any) {',
      `  orders.events.placed.subscribe(o => ${calls}, { strategy: 'handler', queue: 'sales[order].fulfil_on_sales[order].placed' })`,
      '}',
    ].join('\n')
    const file = 'src/contexts/ws/features/sales/order/order.workers.ts'
    expect(await complaints(file, workers('orders.fulfil(o.id)'))).toEqual([])
    // Named after the module, but not of its type: not the module.
    expect(await complaints(file, workers('deps.orders.fulfil(o.id)'))).toEqual(['newt/reaction-queue'])
    // Of no type TypeScript knows: not judged.
    expect(await complaints(file, workers('untyped.fulfil(o.id)'))).toEqual([])
  })

  test("keeps a module's schema to its contract", async () => {
    const schema = 'src/contexts/ws/features/sales/order/order.schema.ts'
    expect(await complaints(schema, "import { defineFilter } from '@newt-js/core'\nimport { z } from 'zod'\nexport const x = [defineFilter, z]\n")).toEqual([])
    expect(await complaints(schema, "import { HttpRouter } from '@newt-js/core/http'\nexport const x = HttpRouter\n")).toEqual(['newt/schema-imports'])
    expect(await complaints(schema, "import { Order } from './order'\nexport const x = Order\n")).toEqual(['newt/schema-imports'])
    // The rest of a module is not its contract: it may.
    expect(await complaints('src/contexts/ws/features/sales/order/order.routes.ts', "import { HttpRouter } from '@newt-js/core/http'\nexport const x = HttpRouter\n")).toEqual([])
  })

  test("reaches another module only through its API: its DTOs as types, never its schema as a value", async () => {
    await complaints('src/contexts/ws/features/sales/folder/folder.schema.ts', "import { z } from 'zod'\nexport const FolderSchema = z.object({ id: z.string() })\nexport type FolderDTO = z.infer<typeof FolderSchema>\n")
    const schema = 'src/contexts/ws/features/sales/note/note.schema.ts'
    // Said once, by module-imports: schema-imports lets a schema name another's, and module-imports says how.
    expect(await complaints(schema, "import { z } from 'zod'\nimport { FolderSchema } from '../folder/folder.schema'\nexport const NoteSchema = z.object({ folderId: FolderSchema.shape.id })\n")).toEqual(['newt/module-imports'])
    expect(await complaints(schema, "import { z } from 'zod'\nimport type { FolderDTO } from '../folder/folder.schema'\nexport const NoteSchema = z.object({ folderId: z.string() })\nexport type NoteFolder = FolderDTO\n")).toEqual([])
    expect(await complaints('src/contexts/ws/features/sales/note/note.module.ts', "import { FolderSchema } from '@/contexts/ws/features/sales/folder/folder.schema'\nexport const x = FolderSchema\n")).toEqual(['newt/module-imports'])
  })

  test('keeps every public method of a module a use case, wherever the module is', async () => {
    const module = (body: string) => `import { Module, UseCase } from '@newt-js/core'\nexport class Order_Module extends Module {\n${body}\n}\n`
    expect(await complaints('src/contexts/ws/features/sales/order/order.module.ts', module('@UseCase() async place() {}\nprivate load() {}'))).toEqual([])
    expect(await complaints('src/contexts/ws/features/sales/order/order.module.ts', module('async place() {}'))).toEqual(['newt/use-case-public-methods'])
    expect(await complaints('src/shared/outbox/outbox.module.ts', module('async dead() {}'))).toEqual(['newt/use-case-public-methods'])
  })

  test("passes a route's body to a use case as it came", async () => {
    const routes = (call: string) => `type OrderPlaceDTO = { item: string }\ndeclare const orders: { place(input: unknown): Promise<void> }\nexport const route = async (request: Request) => orders.place(${call})\n`
    expect(await complaints('src/contexts/ws/features/sales/order/order.routes.ts', routes('await request.json()'))).toEqual([])
    expect(await complaints('src/contexts/ws/features/sales/order/order.routes.ts', routes('await request.json() as OrderPlaceDTO'))).toEqual(['newt/route-body-unchecked'])
  })

  test('keeps every body in braces, on lines of its own, a guard too', async () => {
    const file = 'src/contexts/ws/features/sales/brand/brand.module.ts'
    expect(await complaints(file, 'export function f(x: number) {\n  if (x) {\n    return 1\n  }\n  return 2\n}\n')).toEqual([])
    expect(await complaints(file, 'export function f(x: number) {\n  if (x) return 1\n  return 2\n}\n')).toEqual(['curly'])
    expect(await complaints(file, 'export function f(x: number) {\n  if (x) { return 1 }\n  return 2\n}\n')).toEqual(['brace-style', 'brace-style'])
  })

  test('refuses a promise left unawaited, or handed where nobody awaits it', async () => {
    const file = 'src/contexts/ws/features/sales/brand/brand.module.ts'
    expect(await complaints(file, 'async function save() {}\nexport function create() {\n  save()\n}\n')).toEqual(['@typescript-eslint/no-floating-promises'])
    expect(await complaints(file, 'async function save() {}\ndeclare function every(run: () => void): void\nexport function start() {\n  every(async () => {\n    await save()\n  })\n}\n')).toEqual(['@typescript-eslint/no-misused-promises'])
  })

  test("keeps newt's rules on, whatever a comment says", async () => {
    const file = 'src/contexts/ws/features/sales/order/order.module.ts'
    const module = (body: string) => `import { Module, UseCase } from '@newt-js/core'\nexport class Order_Module extends Module {\n${body}\n}\n`
    // One line, the rule named and a reason given: let off.
    expect(await complaints(file, module('// eslint-disable-next-line newt/use-case-public-methods -- newt calls it by name\nasync place() {}'))).toEqual([])
    // With no reason, the rule stays off for the line, and no-disable says why it may not.
    expect(await complaints(file, module('// eslint-disable-next-line newt/use-case-public-methods\nasync place() {}'))).toEqual(['newt/no-disable'])
    // A stretch of code, or a rule of the preset's.
    expect(await complaints(file, `/* eslint-disable newt/use-case-public-methods */\n${module('async place() {}')}`)).toEqual(['newt/no-disable'])
    expect(await complaints(file, `/* eslint-disable curly */\nexport const f = (x: number) => {\n  if (x) return 1\n  return 2\n}\n`)).toEqual(['newt/no-disable'])
    expect(await complaints(file, `/* eslint newt/use-case-public-methods: "off" */\n${module('async place() {}')}`)).toEqual(['newt/no-disable'])
    // A comment that turns off every rule, or no-disable itself, turns it off too: its processor says it all the same.
    expect(await complaints(file, `/* eslint-disable */\n${module('async place() {}')}`)).toEqual(['newt/no-disable'])
    expect(await complaints(file, `/* eslint-disable newt/no-disable, newt/use-case-public-methods */\n${module('async place() {}')}`)).toEqual(['newt/no-disable'])
    expect(await complaints(file, module('async place() {} // eslint-disable-line'))).toEqual(['newt/no-disable'])
    // A rule of the app's own is the app's.
    expect(await complaints(file, '// eslint-disable-next-line no-console\nconsole.log(1)\n')).toEqual([expect.stringContaining('Unused eslint-disable directive')])
  })

  test("keeps an app's imports, whatever a comment says or an alias hides", async () => {
    const app = 'src/contexts/ws/app'
    await mkdir(join(root, app), { recursive: true })
    await writeFile(join(root, app, 'tsconfig.json'), JSON.stringify({ compilerOptions: { strict: true, module: 'Preserve', moduleResolution: 'bundler', jsx: 'react-jsx', paths: { '@/*': ['../../../*'] } }, include: ['**/*.ts', '**/*.tsx'] }))
    expect(await complaints(`${app}/a.tsx`, "// eslint-disable-next-line newt/app-imports\nimport { requiredEnv } from '../../../env'\nexport const a = requiredEnv\n")).toEqual(['newt/no-disable'])
    expect(await complaints(`${app}/b.tsx`, "import { requiredEnv } from '@/env'\nexport const b = requiredEnv\n")).toEqual(['newt/app-imports'])
  })

  test('says what a rule of newt found in a message an agent can follow', async () => {
    const path = join(root, 'src/contexts/ws/features/sales/order/helpers.ts')
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, 'export const x = 1\n')
    const [result] = await eslint.lintFiles([path])
    expect(result?.messages.map(each => each.message)).toEqual([expect.stringContaining('Move its code to one of them')])
  })

  test('reads where a module is from the project, not from the folders above it', async () => {
    const outer = await mkdtemp(join(tmpdir(), 'newt-lint-'))
    const project = join(outer, 'features', 'proj', 'modules', 'x')
    await mkdir(join(project, 'shop/features/sales/order'), { recursive: true })
    await writeFile(join(project, 'tsconfig.json'), JSON.stringify({ include: ['**/*.ts'] }))
    await writeFile(join(project, 'shop/features/sales/order/order.module.ts'), "import { Order_Repository } from '../product/product.repository'\nexport const x = Order_Repository\n")
    try {
      const linter = new ESLint({ cwd: project, overrideConfigFile: true, overrideConfig: newt() })
      const [result] = await linter.lintFiles([join(project, 'shop/features/sales/order/order.module.ts')])
      expect(result?.messages.map(each => each.ruleId)).toEqual(['newt/module-imports'])
    } finally {
      await rm(outer, { recursive: true, force: true })
    }
  })

  test('lints only the files it is given, when given some', async () => {
    const linter = new ESLint({ cwd: root, overrideConfigFile: true, overrideConfig: newt({ files: ['app/**/*.ts'], contexts: { folder: 'app/contexts', uses: { auth: [], ws: ['auth'] } } }) })
    expect(await complaints('app/contexts/ws/features/sales/order/helpers.ts', 'export const x = 1\n', linter)).toEqual(['newt/module-files'])
    expect(await complaints('app/contexts/auth/auth.context.ts', "import { x } from '../ws/ws.context'\nexport const y = x\n", linter)).toEqual(['newt/context-imports'])
    expect(await complaints('other/features/sales/order/helpers.ts', 'export const x = 1\n', linter)).toEqual([expect.stringContaining('no matching configuration')])
  })

  test("keeps a feature's entry point from handing out a module's own files", async () => {
    const entry = 'src/contexts/ws/features/sales/sales.feature.ts'
    expect(await complaints(entry, "export * from './brand/brand.repository'\n")).toEqual(['newt/module-imports'])
    expect(await complaints(entry, "export * from './brand/brand.module'\n")).toEqual(['newt/module-imports'])
    expect(await complaints(entry, "export type * from './brand/brand.module'\n")).toEqual([])
    expect(await complaints(entry, "export * from './brand/errors/brand-not-found'\n")).toEqual([])
    expect(await complaints(entry, "import { x } from './brand/brand.repository'\nexport const y = x\n")).toEqual([])
  })

  test('keeps contexts a tree from any folder ESLint runs in, with the folder written either way', async () => {
    const outer = await mkdtemp(join(tmpdir(), 'newt-lint-'))
    const preset = JSON.stringify(pathToFileURL(join(import.meta.dirname, 'index.ts')).href)
    // A project with its own eslint.config.ts, linted from `inside` it.
    const lint = async (name: string, folder: string, inside: string) => {
      const project = join(outer, name)
      await mkdir(join(project, 'app/contexts/cs'), { recursive: true })
      await mkdir(join(project, 'app/contexts/ws'), { recursive: true })
      await writeFile(join(project, 'tsconfig.json'), JSON.stringify({ include: ['**/*.ts'] }))
      await writeFile(join(project, 'eslint.config.ts'), `import { newt } from ${preset}\nexport default newt({ root: import.meta.dirname, files: ['app/**/*.ts'], contexts: { folder: ${folder}, uses: { auth: [], ws: ['auth'], cs: ['auth'] } } })\n`)
      await writeFile(join(project, 'app/contexts/cs/cs.context.ts'), 'export const x = 1\n')
      await writeFile(join(project, 'app/contexts/ws/ws.context.ts'), "import { x } from '../cs/cs.context'\nexport const y = x\n")
      const [result] = await new ESLint({ cwd: join(project, inside) }).lintFiles([join(project, 'app/contexts/ws/ws.context.ts')])
      return result?.messages.map(each => each.ruleId ?? each.message)
    }
    try {
      expect(await lint('root', "'app/contexts'", '.')).toEqual(['newt/context-imports'])
      expect(await lint('sub', "'./app/contexts/'", 'app')).toEqual(['newt/context-imports'])
      expect(await lint('absolute', "import.meta.dirname + '/app/contexts/'", 'app')).toEqual(['newt/context-imports'])
    } finally {
      await rm(outer, { recursive: true, force: true })
    }
  })

  test('finds the modules of an application without contexts the same way', async () => {
    expect(await complaints('features/sales/order/helpers.ts', 'export const x = 1\n')).toEqual(['newt/module-files'])
    // The old layout, a module of no feature, is no module.
    expect(await complaints('shop/modules/order/helpers.ts', 'export const x = 1\n')).toEqual([])
  })
})
