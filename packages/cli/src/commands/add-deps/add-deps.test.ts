import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { join }           from 'node:path'
// --------------------------------------------------------
import { runCommand }     from '../../run/run-command/run-command'
import { checkGenerated } from '../../testing/check-generated/check-generated'
import { moduleProject }  from '../../testing/module-project/module-project'
import { ADD_MODULE }     from '../add-module/add-module'
import type { Command }   from '../command'
import { ADD_DEPS }       from './add-deps'

const run = (command: Command, args: string[], cwd: string) => runCommand(command, args, { cwd, ask: null })

const SALES = 'src/contexts/sales'

const read = (backend: string, file: string) => Bun.file(join(backend, SALES, file)).text()

async function withInvoice(): Promise<string> {
  const backend = await moduleProject()
  await run(ADD_MODULE, ['sales/orders/invoice'], backend)
  return backend
}

describe('newt add deps', () => {
  test('order uses invoice, given by orders.feature.ts, and its lint, types and tests pass', async () => {
    const backend = await withInvoice()
    expect((await run(ADD_DEPS, ['sales/orders/order', 'invoice'], backend)).code).toBe(0)
    expect(await read(backend, 'features/orders/modules/order/order.deps.ts')).toBe("import type { Invoice_Module } from '../invoice/invoice.module'\n\nexport type Order_Deps = {\n  invoice: Invoice_Module\n}\n")
    expect(await read(backend, 'features/orders/modules/order/order.module.ts')).toContain("    super('orders[order]', base.useCaseRunner, deps)")
    expect(await read(backend, 'features/orders/orders.feature.ts')).toContain('  const invoice = Invoice_Module.initialize(base, router)\n  const order = Order_Module.initialize(base, router, { invoice })')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test("order hangs its routes under invoice's, through the group invoice exposes, and its lint, types and tests pass", async () => {
    const backend = await withInvoice()
    await run(ADD_DEPS, ['sales/orders/order', 'invoice'], backend)
    const routes = join(backend, SALES, 'features/orders/modules/order/order.routes.ts')
    expect(await Bun.file(routes).text()).toContain('export function registerOrderRoutes(router: HttpRouter, orders: Order_Module, deps: Order_Deps) {')
    expect(await read(backend, 'features/orders/modules/order/order.module.ts')).toContain('    this.routes = registerOrderRoutes(router, this, deps)')
    const under = "  deps.invoice.routes.one.get('/orders', async request => Response.json({ invoice: request.params.invoiceId }))\n"
    await Bun.write(routes, (await Bun.file(routes).text()).replace('  return { one:', `${under}  return { one:`))
    await Bun.write(join(backend, SALES, 'features/orders/modules/order/order-under-invoice.test.ts'), `import { expect, test } from 'bun:test'
import { testContext } from '@newt-js/core/application/testing'
import { MemoryCluster } from '@newt-js/core/cluster/memory'
import { MemoryDatabase } from '@newt-js/core/database/memory'
import { HttpRouter } from '@newt-js/core/http'
import { salesFeatures } from '../../../../sales-features'

test('GET /orders/invoices/:invoiceId/orders answers from order, under invoice', async () => {
  const context = await testContext({ name: 'sales', cluster: new MemoryCluster(), database: new MemoryDatabase() })
  const router = new HttpRouter({ prefix: '/sales/api', public: true })
  salesFeatures(context.base, router)
  const response = await router.answer(new Request('http://backend.test/sales/api/orders/invoices/7/orders'))
  expect(await response?.json()).toEqual({ invoice: '7' })
  await context.close()
})
`)
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('a second module it uses joins the first', async () => {
    const backend = await withInvoice()
    await run(ADD_MODULE, ['sales/orders/customer'], backend)
    await run(ADD_DEPS, ['sales/orders/order', 'invoice'], backend)
    await run(ADD_DEPS, ['sales/orders/order', 'customer'], backend)
    expect(await read(backend, 'features/orders/orders.feature.ts')).toContain('Order_Module.initialize(base, router, { invoice, customer })')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('run again, it changes nothing and warns of nothing', async () => {
    const backend = await withInvoice()
    await run(ADD_DEPS, ['sales/orders/order', 'invoice'], backend)
    const again = JSON.parse((await run(ADD_DEPS, ['sales/orders/order', 'invoice', '--json'], backend)).text) as { files: { status: string }[], warnings: string[] }
    expect(again.files.filter(file => file.status !== 'skipped')).toEqual([])
    expect(again.warnings).toEqual([])
  })

  test('each module comes after every module it uses, however they were added', async () => {
    const backend = await moduleProject()
    for (const module of ['alpha', 'charlie', 'bravo']) await run(ADD_MODULE, [`sales/orders/${module}`], backend)
    await run(ADD_DEPS, ['sales/orders/charlie', 'alpha'], backend)
    await run(ADD_DEPS, ['sales/orders/alpha', 'bravo'], backend)
    const modules = await read(backend, 'features/orders/orders.feature.ts')
    expect(modules.indexOf('const bravo =')).toBeLessThan(modules.indexOf('const alpha ='))
    expect(modules.indexOf('const alpha =')).toBeLessThan(modules.indexOf('const charlie ='))
  })

  test('a module using one that uses another: every module\'s tests compile and pass, and no test was edited', async () => {
    const backend = await moduleProject()
    for (const module of ['alpha', 'bravo', 'charlie']) await run(ADD_MODULE, [`sales/orders/${module}`], backend)
    const test = await read(backend, 'features/orders/modules/bravo/bravo.module.test.ts')
    await run(ADD_DEPS, ['sales/orders/bravo', 'charlie'], backend)
    await run(ADD_DEPS, ['sales/orders/alpha', 'bravo'], backend)
    expect(await read(backend, 'features/orders/modules/bravo/bravo.module.test.ts')).toBe(test)
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('refuses a cycle through other modules', async () => {
    const backend = await moduleProject()
    for (const module of ['alpha', 'bravo', 'charlie']) await run(ADD_MODULE, [`sales/orders/${module}`], backend)
    await run(ADD_DEPS, ['sales/orders/alpha', 'bravo'], backend)
    await run(ADD_DEPS, ['sales/orders/bravo', 'charlie'], backend)
    expect((await run(ADD_DEPS, ['sales/orders/charlie', 'alpha'], backend)).text).toBe('charlie → alpha → bravo → charlie would be a cycle: modules never use each other, even through others')
  })

  test('refuses a module the context has not, itself, a cycle, or another context', async () => {
    const backend = await withInvoice()
    expect((await run(ADD_DEPS, ['sales/orders/order', 'customer'], backend)).text).toBe('The feature sales/orders has no module customer: add it with newt add module sales/orders/customer')
    expect((await run(ADD_DEPS, ['sales/orders/order', 'order'], backend)).text).toBe('order cannot use itself')
    await run(ADD_DEPS, ['sales/orders/order', 'invoice'], backend)
    expect((await run(ADD_DEPS, ['sales/orders/invoice', 'order'], backend)).text).toBe('invoice → order → invoice would be a cycle: modules never use each other, even through others')
    expect((await run(ADD_DEPS, ['sales/orders/order', 'billing/invoice'], backend)).text).toStartWith("A module uses another context's modules")
  })
})
