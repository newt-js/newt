import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { join }           from 'node:path'
// --------------------------------------------------------
import { runCommand }     from '../../run/run-command/run-command'
import { checkGenerated } from '../../testing/check-generated/check-generated'
import { generate }       from '../../testing/generate/generate'
import { ADD_CONTEXT }    from '../add-context/add-context'
import type { Command }   from '../command'
import { INIT }           from '../init/init'
import { ADD_MODULE }     from './add-module'

const run = (command: Command, args: string[], cwd: string) => runCommand(command, args, { cwd, ask: null })

async function backendWithContext(db = 'sqlite'): Promise<string> {
  const backend = join(await generate(INIT, ['shop']), 'shop')
  await run(ADD_CONTEXT, ['sales', '--db', db], backend)
  return backend
}

const read = (path: string) => Bun.file(path).text()

describe('newt add module', () => {
  test('a module whose lint, types and tests pass, its table made by its migration as the context opens', async () => {
    const backend = await backendWithContext()
    const output = await run(ADD_MODULE, ['sales/order'], backend)
    expect(output.code).toBe(0)
    expect(await read(join(backend, 'src/contexts/sales/migrations/00001_order_up.sql'))).toStartWith('CREATE TABLE "order" (')
    expect(await read(join(backend, 'src/contexts/sales/sales-modules.ts'))).toContain('  return {\n    order: Order_Module.initialize(base, router),\n  }')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('a second module takes the next migration, and both are initialized', async () => {
    const backend = await backendWithContext()
    await run(ADD_MODULE, ['sales/order'], backend)
    await run(ADD_MODULE, ['sales/price-change'], backend)
    expect(await Bun.file(join(backend, 'src/contexts/sales/migrations/00002_price_change_up.sql')).exists()).toBe(true)
    const modules = await read(join(backend, 'src/contexts/sales/sales-modules.ts'))
    expect(modules).toContain('    priceChange: PriceChange_Module.initialize(base, router),')
    expect(modules).toContain("import { PriceChange_Module } from './modules/price-change/price-change.module'")
    expect(await read(join(backend, 'src/contexts/sales/modules/price-change/price-change.routes.ts'))).toContain("router.post('/price-changes'")
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
    expect(await checkGenerated(postgres, { tests: false })).toEqual([])
    const mysql = await backendWithContext('mysql')
    await run(ADD_MODULE, ['sales/order'], mysql)
    expect(await read(join(mysql, 'src/contexts/sales/migrations/00001_order_up.sql'))).toContain('CREATE TABLE `order` (\n  id VARCHAR(64) COLLATE utf8mb4_0900_bin PRIMARY KEY,')
    expect(await read(join(mysql, 'src/contexts/sales/migrations/00001_order_down.sql'))).toBe('DROP TABLE `order`;\n')
  }, 30_000)

  test('run again, it changes nothing and makes no second migration', async () => {
    const backend = await backendWithContext()
    await run(ADD_MODULE, ['sales/order'], backend)
    const again = JSON.parse((await run(ADD_MODULE, ['sales/order', '--json'], backend)).text) as { files: { status: string }[] }
    expect(again.files.filter(file => file.status !== 'skipped')).toEqual([])
    expect(await Bun.file(join(backend, 'src/contexts/sales/migrations/00002_order_up.sql')).exists()).toBe(false)
  })

  test('says what to do next, and that its routes ask for a session', async () => {
    const output = await run(ADD_MODULE, ['sales/order', '--dry-run'], await backendWithContext())
    expect(output.text).toEndWith("Next steps:\n  bun test src/contexts/sales/modules/order\n  its routes ask for a session: give sales's router an authenticator, router.authenticateWith(...), before calling them")
  })

  test('refuses a context the backend has not, or names that are not', async () => {
    const backend = await backendWithContext()
    expect((await run(ADD_MODULE, ['billing/invoice'], backend)).text).toBe('The backend has no context billing: add it with newt add context billing')
    expect((await run(ADD_MODULE, ['sales/Order'], backend)).text).toStartWith("'Order' cannot name a module")
    expect((await run(ADD_MODULE, ['order'], backend)).text).toBe('newt add module takes the context and the module, as in newt add module sales/order')
  })
})
