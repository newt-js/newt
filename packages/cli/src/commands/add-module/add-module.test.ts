import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
import { join }             from 'node:path'
// --------------------------------------------------------
import { runCommand }       from '../../run/run-command/run-command'
import { checkGenerated }   from '../../testing/check-generated/check-generated'
import { generate }         from '../../testing/generate/generate'
import { linkDependencies } from '../../testing/link-dependencies/link-dependencies'
import { ADD_CONTEXT }      from '../add-context/add-context'
import { ADD_DEPS }         from '../add-deps/add-deps'
import { ADD_ROUTE }        from '../add-route/add-route'
import { ADD_USE_CASE }     from '../add-use-case/add-use-case'
import type { Command }     from '../command'
import { INIT }             from '../init/init'
import { ADD_MODULE }       from './add-module'

const run = (command: Command, args: string[], cwd: string) => runCommand(command, args, { cwd, ask: null })

async function backendWithContext(db = 'sqlite'): Promise<string> {
  const backend = join(await generate(INIT, ['shop', '--db', db]), 'shop')
  await run(ADD_CONTEXT, ['sales'], backend)
  return backend
}

const read = (path: string) => Bun.file(path).text()

describe('newt add module', () => {
  test('a module whose lint, types and tests pass, its table made by its migration as the context opens', async () => {
    const backend = await backendWithContext()
    const output = await run(ADD_MODULE, ['sales/order'], backend)
    expect(output.code).toBe(0)
    expect(await read(join(backend, 'src/contexts/sales/migrations/00001_order_up.sql'))).toStartWith('CREATE TABLE "order" (')
    expect(await read(join(backend, 'src/contexts/sales/sales-modules.ts'))).toContain('  const order = Order_Module.initialize(base, router)\n  return {\n    order,\n  }')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('a second module takes the next migration, and both are initialized', async () => {
    const backend = await backendWithContext()
    await run(ADD_MODULE, ['sales/order'], backend)
    await run(ADD_MODULE, ['sales/price-change'], backend)
    expect(await Bun.file(join(backend, 'src/contexts/sales/migrations/00002_price_change_up.sql')).exists()).toBe(true)
    const modules = await read(join(backend, 'src/contexts/sales/sales-modules.ts'))
    expect(modules).toContain('  const order = Order_Module.initialize(base, router)\n  const priceChange = PriceChange_Module.initialize(base, router)\n  return {\n    order,\n    priceChange,\n  }')
    expect(modules).toContain("import { PriceChange_Module } from './modules/price-change/price-change.module'")
    expect(await read(join(backend, 'src/contexts/sales/modules/price-change/price-change.routes.ts'))).toContain("router.post('/sales/price-changes'")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('in a context in memory, no migration, and its lint, types and tests pass', async () => {
    const backend = await backendWithContext('memory')
    const report = JSON.parse((await run(ADD_MODULE, ['sales/order', '--json'], backend)).text) as { files: { path: string }[] }
    expect(report.files.some(file => file.path.includes('migrations'))).toBe(false)
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('in postgres and mysql, the table in their SQL, quoted as each quotes', async () => {
    const postgres = await backendWithContext('postgres')
    await run(ADD_MODULE, ['sales/order'], postgres)
    expect(await read(join(postgres, 'src/contexts/sales/migrations/00001_order_up.sql'))).toContain('CREATE TABLE "order" (\n  id TEXT COLLATE "C" PRIMARY KEY,')
    expect(await checkGenerated(postgres)).toEqual([])
    const mysql = await backendWithContext('mysql')
    await run(ADD_MODULE, ['sales/order'], mysql)
    expect(await read(join(mysql, 'src/contexts/sales/migrations/00001_order_up.sql'))).toContain('CREATE TABLE `order` (\n  id VARCHAR(64) COLLATE utf8mb4_0900_bin PRIMARY KEY,')
    expect(await read(join(mysql, 'src/contexts/sales/migrations/00001_order_down.sql'))).toBe('DROP TABLE `order`;\n')
  }, 30_000)

  const SERVERS = [{ db: 'postgres', url: Bun.env.POSTGRES_TEST_URL }, { db: 'mysql', url: Bun.env.MYSQL_TEST_URL }]

  for (const { db, url } of SERVERS) {
    test.skipIf(!url)(`on ${db}, its migration runs on a real server when TEST_DATABASE_URL is set, and a broken one fails`, async () => {
      const backend = await backendWithContext(db)
      await run(ADD_MODULE, ['sales/order'], backend)
      await linkDependencies(backend)
      const migrationsTest = () => Bun.spawn([process.execPath, 'test', 'src/migrations.test.ts'], { cwd: backend, env: { ...Bun.env, TEST_DATABASE_URL: url }, stdout: 'pipe', stderr: 'pipe' }).exited
      expect(await migrationsTest()).toBe(0)
      await Bun.write(join(backend, 'src/contexts/sales/migrations/00001_order_up.sql'), 'CRATE TABEL "order" (id TEXT);\n')
      expect(await migrationsTest()).not.toBe(0)
    }, 60_000)
  }

  test('without TEST_DATABASE_URL, the migrations test is skipped and says so', async () => {
    const backend = await backendWithContext('postgres')
    expect(await read(join(backend, 'src/migrations.test.ts'))).toContain("test.skipIf(!serverUrl)('every context\\'s migrations run on a real Postgres, skipped without TEST_DATABASE_URL'")
    expect(await read(join(backend, 'AGENTS.md'))).toContain('Set `TEST_DATABASE_URL`')
    expect(await Bun.file(join(await backendWithContext('sqlite'), 'src/migrations.test.ts')).exists()).toBe(false)
  })

  test("AGENTS.md says a schema change needs a migration, and which tests run it", async () => {
    const postgres = await read(join(await backendWithContext('postgres'), 'AGENTS.md'))
    expect(postgres).toContain('`<number>_<table>_up.sql` and `<number>_<table>_down.sql`')
    expect(postgres).toContain('The tests run in memory and miss them')
    expect(await read(join(await backendWithContext('sqlite'), 'AGENTS.md'))).toContain('The tests run them.')
  })

  test('a module of an irregular plural, and one given with --plural, which later commands keep', async () => {
    const backend = await backendWithContext()
    await run(ADD_MODULE, ['sales/person'], backend)
    expect(await read(join(backend, 'src/contexts/sales/modules/person/person.routes.ts'))).toContain("router.get('/sales/people'")
    expect((await run(ADD_MODULE, ['sales/cactus', '--plural', 'cacti'], backend)).code).toBe(0)
    expect(await read(join(backend, 'src/contexts/sales/modules/cactus/cactus.routes.ts'))).toContain('export function registerCactusRoutes(router: HttpRouter, cacti: Cactus_Module): void {')
    expect((await run(ADD_USE_CASE, ['sales/cactus', 'water'], backend)).code).toBe(0)
    expect((await run(ADD_ROUTE, ['sales/cactus', 'water'], backend)).code).toBe(0)
    expect(await read(join(backend, 'src/contexts/sales/modules/cactus/cactus.routes.ts'))).toContain("router.post('/sales/cacti/:id/water', async request => Response.json(await cacti.water(")
    expect(await checkGenerated(backend)).toEqual([])
  }, 60_000)

  test('a module named transaction, whose repository field the lint tells from a transaction', async () => {
    const backend = await backendWithContext()
    await run(ADD_MODULE, ['sales/transaction'], backend)
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('run again, it changes nothing and makes no second migration', async () => {
    const backend = await backendWithContext()
    await run(ADD_MODULE, ['sales/order'], backend)
    const again = JSON.parse((await run(ADD_MODULE, ['sales/order', '--json'], backend)).text) as { files: { status: string }[] }
    expect(again.files.filter(file => file.status !== 'skipped')).toEqual([])
    expect(await Bun.file(join(backend, 'src/contexts/sales/migrations/00002_order_up.sql')).exists()).toBe(false)
  })

  test('run again after it took deps, it does not declare the module twice', async () => {
    const backend = await backendWithContext()
    await run(ADD_MODULE, ['sales/order'], backend)
    await run(ADD_MODULE, ['sales/invoice'], backend)
    await run(ADD_DEPS, ['sales/order', 'invoice'], backend)
    await run(ADD_MODULE, ['sales/order'], backend)
    expect((await read(join(backend, 'src/contexts/sales/sales-modules.ts'))).match(/const order =/g)).toHaveLength(1)
  })

  test('says what to do next, and that its routes ask for a session', async () => {
    const output = await run(ADD_MODULE, ['sales/order', '--dry-run'], await backendWithContext())
    expect(output.text).toEndWith("Next steps:\n  bun test src/contexts/sales/modules/order\n  its routes ask for a session: write authenticate in src/auth.ts to call them from outside the tests")
  })

  test("from another folder, points at the backend's own src/auth.ts", async () => {
    const backend = await backendWithContext()
    const output = await run(ADD_MODULE, ['sales/order', '--backend', 'shop', '--dry-run'], join(backend, '..'))
    expect(output.text).toContain('write authenticate in shop/src/auth.ts')
  })

  test('refuses a context the backend has not, or names that are not', async () => {
    const backend = await backendWithContext()
    expect((await run(ADD_MODULE, ['billing/invoice'], backend)).text).toBe('The backend has no context billing: add it with newt add context billing')
    expect((await run(ADD_MODULE, ['sales/Order'], backend)).text).toStartWith("'Order' cannot name a module")
    expect((await run(ADD_MODULE, ['order'], backend)).text).toBe('newt add module takes the context and the module, as in newt add module sales/order')
  })
})
