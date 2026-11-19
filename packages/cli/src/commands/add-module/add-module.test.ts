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
    const output = await run(ADD_MODULE, ['sales/orders/order'], backend)
    expect(output.code).toBe(0)
    expect(await read(join(backend, 'src/contexts/sales/migrations/00001_orders__order_up.sql'))).toStartWith('CREATE TABLE "orders$order" (')
    expect(await read(join(backend, 'src/contexts/sales/sales.context.ts'))).toContain('    const orders = Orders_Feature.initialize(base, router)\n    return new Sales_Context(base, orders)')
    expect(await read(join(backend, 'src/contexts/sales/features/orders/orders.feature.ts'))).toContain("    const order = Order_Module.initialize(base, router)\n    return new Orders_Feature(base, order)\n  }\n\n  private constructor(\n    base: ContextBase,\n    readonly order: Order_Module,\n  ) {\n    super('orders', base, [order])")
    expect(await read(join(backend, 'src/contexts/sales/features/orders/index.ts'))).toBe("export { Orders_Feature } from './orders.feature'\nexport type { OrderCreateDTO, OrderDTO, OrderFilterDTO, OrderSortDTO } from './order/order.schema'\n")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('a second module takes the next migration, and both are initialized', async () => {
    const backend = await backendWithContext()
    await run(ADD_MODULE, ['sales/orders/order'], backend)
    await run(ADD_MODULE, ['sales/orders/price-change'], backend)
    expect(await Bun.file(join(backend, 'src/contexts/sales/migrations/00002_orders__price_change_up.sql')).exists()).toBe(true)
    const modules = await read(join(backend, 'src/contexts/sales/features/orders/orders.feature.ts'))
    expect(modules).toContain("    const order = Order_Module.initialize(base, router)\n    const priceChange = PriceChange_Module.initialize(base, router)\n    return new Orders_Feature(base, order, priceChange)")
    expect(modules).toContain("super('orders', base, [order, priceChange])")
    expect(modules).toContain("import { PriceChange_Module } from './price-change/price-change.module'")
    expect(await read(join(backend, 'src/contexts/sales/features/orders/price-change/price-change.routes.ts'))).toContain("router.post('/orders/price-changes'")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('in a context in memory, no migration, and its lint, types and tests pass', async () => {
    const backend = await backendWithContext('memory')
    const report = JSON.parse((await run(ADD_MODULE, ['sales/orders/order', '--json'], backend)).text) as { files: { path: string }[] }
    expect(report.files.some(file => file.path.includes('migrations'))).toBe(false)
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('in postgres and mysql, the table in their SQL, quoted as each quotes', async () => {
    const postgres = await backendWithContext('postgres')
    await run(ADD_MODULE, ['sales/orders/order'], postgres)
    expect(await read(join(postgres, 'src/contexts/sales/migrations/00001_orders__order_up.sql'))).toContain('CREATE TABLE "orders$order" (\n  id TEXT COLLATE "C" PRIMARY KEY,')
    expect(await checkGenerated(postgres)).toEqual([])
    const mysql = await backendWithContext('mysql')
    await run(ADD_MODULE, ['sales/orders/order'], mysql)
    expect(await read(join(mysql, 'src/contexts/sales/migrations/00001_orders__order_up.sql'))).toContain('CREATE TABLE `orders$order` (\n  id VARCHAR(64) COLLATE utf8mb4_0900_bin PRIMARY KEY,')
    expect(await read(join(mysql, 'src/contexts/sales/migrations/00001_orders__order_down.sql'))).toBe('DROP TABLE `orders$order`;\n')
  }, 30_000)

  const SERVERS = [{ db: 'postgres', url: Bun.env.POSTGRES_TEST_URL }, { db: 'mysql', url: Bun.env.MYSQL_TEST_URL }]

  for (const { db, url } of SERVERS) {
    test.skipIf(!url)(`on ${db}, its tests run on a real server when TEST_DATABASE_URL is set, and a column the migration lacks fails them`, async () => {
      const backend = await backendWithContext(db)
      await run(ADD_MODULE, ['sales/orders/order'], backend)
      await linkDependencies(backend)
      const moduleTests = () => Bun.spawn([process.execPath, 'test', 'src/contexts'], { cwd: backend, env: { ...Bun.env, TEST_DATABASE_URL: url }, stdout: 'pipe', stderr: 'pipe' }).exited
      expect(await moduleTests()).toBe(0)
      const up = join(backend, 'src/contexts/sales/migrations/00001_orders__order_up.sql')
      await Bun.write(up, (await read(up)).replace(/\n\s+name .*\n/, '\n'))
      expect(await moduleTests()).not.toBe(0)
    }, 60_000)
  }

  test('without TEST_DATABASE_URL, the tests of a module on a server run in memory', async () => {
    const backend = await backendWithContext('postgres')
    await run(ADD_MODULE, ['sales/orders/order'], backend)
    expect(await read(join(backend, 'src/test-database.ts'))).toContain('return { database: new MemoryDatabase(), drop: async () => {} }')
    expect(await read(join(backend, 'src/contexts/sales/features/orders/order/order.module.test.ts'))).toContain("await testDatabase(join(import.meta.dir, '../../../migrations'))")
    expect(await read(join(backend, 'AGENTS.md'))).toContain('with `TEST_DATABASE_URL`')
    expect(await Bun.file(join(await backendWithContext('sqlite'), 'src/test-database.ts')).exists()).toBe(false)
  })

  test("AGENTS.md says a schema change needs a migration, and which tests run it", async () => {
    const postgres = await read(join(await backendWithContext('postgres'), 'AGENTS.md'))
    expect(postgres).toContain('`<number>_<feature>__<module>_up.sql` and `<number>_<feature>__<module>_down.sql` (the table is `<feature>$<module>`)')
    expect(postgres).toContain('The tests run in memory and miss them, unless `TEST_DATABASE_URL` is set')
    expect(await read(join(await backendWithContext('sqlite'), 'AGENTS.md'))).toContain('The tests run them.')
  })

  test('a module of an irregular plural, and one given with --plural, which later commands keep', async () => {
    const backend = await backendWithContext()
    await run(ADD_MODULE, ['sales/orders/person'], backend)
    expect(await read(join(backend, 'src/contexts/sales/features/orders/person/person.routes.ts'))).toContain("router.get('/orders/people'")
    expect((await run(ADD_MODULE, ['sales/orders/cactus', '--plural', 'cacti'], backend)).code).toBe(0)
    expect(await read(join(backend, 'src/contexts/sales/features/orders/cactus/cactus.routes.ts'))).toContain('export function registerCactusRoutes(router: HttpRouter, cacti: Cactus_Module) {')
    expect((await run(ADD_USE_CASE, ['sales/orders/cactus', 'water'], backend)).code).toBe(0)
    expect((await run(ADD_ROUTE, ['sales/orders/cactus', 'water'], backend)).code).toBe(0)
    expect(await read(join(backend, 'src/contexts/sales/features/orders/cactus/cactus.routes.ts'))).toContain("router.post('/orders/cacti/:id/water', async request => Response.json(await cacti.water(")
    expect(await checkGenerated(backend)).toEqual([])
  }, 60_000)

  test('a module named transaction, whose repository field the lint tells from a transaction', async () => {
    const backend = await backendWithContext()
    await run(ADD_MODULE, ['sales/orders/transaction'], backend)
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('run again, it changes nothing and makes no second migration', async () => {
    const backend = await backendWithContext()
    await run(ADD_MODULE, ['sales/orders/order'], backend)
    const again = JSON.parse((await run(ADD_MODULE, ['sales/orders/order', '--json'], backend)).text) as { files: { status: string }[] }
    expect(again.files.filter(file => file.status !== 'skipped')).toEqual([])
    expect(await Bun.file(join(backend, 'src/contexts/sales/migrations/00002_orders__order_up.sql')).exists()).toBe(false)
  })

  test('run again after it took deps, it does not declare the module twice', async () => {
    const backend = await backendWithContext()
    await run(ADD_MODULE, ['sales/orders/order'], backend)
    await run(ADD_MODULE, ['sales/orders/invoice'], backend)
    await run(ADD_DEPS, ['sales/orders/order', 'invoice'], backend)
    await run(ADD_MODULE, ['sales/orders/order'], backend)
    expect((await read(join(backend, 'src/contexts/sales/features/orders/orders.feature.ts'))).match(/const order =/g)).toHaveLength(1)
  })

  test('says what to do next, and that its routes ask for a session', async () => {
    const output = await run(ADD_MODULE, ['sales/orders/order', '--dry-run'], await backendWithContext())
    expect(output.text).toEndWith("Next steps:\n  bun test src/contexts/sales/features/orders/order\n  its routes ask for a session: write authenticate in src/auth.ts to call them from outside the tests")
  })

  test("from another folder, points at the backend's own src/auth.ts", async () => {
    const backend = await backendWithContext()
    const output = await run(ADD_MODULE, ['sales/orders/order', '--backend', 'shop', '--dry-run'], join(backend, '..'))
    expect(output.text).toContain('write authenticate in shop/src/auth.ts')
  })

  test('two modules whose feature and module words split alike take tables and migrations of their own', async () => {
    const backend = await backendWithContext()
    await run(ADD_MODULE, ['sales/price-lists/item'], backend)
    await run(ADD_MODULE, ['sales/price/lists-item'], backend)
    expect(await Bun.file(join(backend, 'src/contexts/sales/migrations/00002_price__lists_item_up.sql')).exists()).toBe(true)
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('refuses a new feature named like a module of the context', async () => {
    const backend = await backendWithContext()
    await run(ADD_MODULE, ['sales/orders/invoice'], backend)
    expect((await run(ADD_MODULE, ['sales/invoice/thing'], backend)).text).toStartWith("'invoice' cannot name a feature of sales: orders has a module of that name")
  })

  test('refuses a context the backend has not, or names that are not', async () => {
    const backend = await backendWithContext()
    expect((await run(ADD_MODULE, ['billing/invoices/invoice'], backend)).text).toBe('The backend has no context billing: add it with newt add context billing')
    expect((await run(ADD_MODULE, ['sales/orders/Order'], backend)).text).toStartWith("'Order' cannot name a module")
    expect((await run(ADD_MODULE, ['sales/order'], backend)).text).toBe('newt add module takes the context, the feature and the module, as in newt add module sales/orders/order')
    expect((await run(ADD_MODULE, ['sales/orders/orders'], backend)).text).toStartWith("'orders' cannot name a module")
  })
})
