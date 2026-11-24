import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { join }           from 'node:path'
// --------------------------------------------------------
import { runCommand }     from '../../run/run-command/run-command'
import { checkGenerated } from '../../testing/check-generated/check-generated'
import { moduleProject }  from '../../testing/module-project/module-project'
import { ADD_CONTEXT }    from '../add-context/add-context'
import { ADD_MODULE }     from '../add-module/add-module'
import type { Command }   from '../command'
import { PUBLISH }        from '../publish/publish'
import { ADD_DEPS }       from './add-deps'

const run = (command: Command, args: string[], cwd: string) => runCommand(command, args, { cwd, ask: null })

const SALES = 'src/contexts/sales'

const read = (backend: string, file: string) => Bun.file(join(backend, SALES, file)).text()

async function withInvoice(): Promise<string> {
  const backend = await moduleProject()
  await run(ADD_MODULE, ['sales/invoice'], backend)
  return backend
}

describe('newt add deps', () => {
  test('order uses invoice, given by sales.context.ts, and its lint, types and tests pass', async () => {
    const backend = await withInvoice()
    expect((await run(ADD_DEPS, ['sales/order', 'invoice'], backend)).code).toBe(0)
    expect(await read(backend, 'modules/order/order.deps.ts')).toBe("import type { Invoice_Module } from '../invoice'\n\nexport type Order_Deps = {\n  invoice: Invoice_Module\n}\n")
    expect(await read(backend, 'modules/order/order.module.ts')).toContain("    super('order', base.useCaseRunner, deps)")
    expect(await read(backend, 'sales.context.ts')).toContain('    const invoice = Invoice_Module.initialize(base, router)\n    const order = Order_Module.initialize(base, router, {\n      invoice,\n    })')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test("order hangs its routes under invoice's, through the route group of invoice, and its lint, types and tests pass", async () => {
    const backend = await withInvoice()
    await run(ADD_DEPS, ['sales/order', 'invoice'], backend)
    const routes = join(backend, SALES, 'modules/order/order.routes.ts')
    expect(await Bun.file(routes).text()).toContain('export function registerOrderRoutes(\n  router: HttpRouter,\n  orders: Order_Module,\n  deps: Order_Deps,\n) {')
    expect(await read(backend, 'modules/order/order.module.ts')).toContain('    this.routes = registerOrderRoutes(router, this, deps)')
    const under = "  deps.invoice.routes.one.get('/orders', async request => {\n    return Response.json({ invoice: request.params.invoiceId })\n  })\n"
    await Bun.write(routes, (await Bun.file(routes).text()).replace('  return { one:', `${under}  return { one:`))
    await Bun.write(join(backend, SALES, 'modules/order/order-under-invoice.test.ts'), `import { testContext }    from '@newt-js/core/application/testing'
import { MemoryCluster }  from '@newt-js/core/cluster/memory'
import { MemoryDatabase } from '@newt-js/core/database/memory'
import { HttpRouter }     from '@newt-js/core/http'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
// --------------------------------------------------------
import { Sales_Context }  from '../../sales.context'

test('GET /invoices/:invoiceId/orders answers from order', async () => {
  const cluster = new MemoryCluster()
  const database = new MemoryDatabase()
  const context = await testContext({ name: 'sales', cluster, database })
  const router = new HttpRouter({ prefix: '/sales/api', public: true })
  Sales_Context.initialize(context.base, router)
  const url = 'http://backend.test/sales/api/invoices/7/orders'
  const response = await router.answer(new Request(url))
  expect(await response?.json()).toEqual({ invoice: '7' })
  await context.close()
})
`)
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('a second module it uses joins the first', async () => {
    const backend = await withInvoice()
    await run(ADD_MODULE, ['sales/customer'], backend)
    await run(ADD_DEPS, ['sales/order', 'invoice'], backend)
    await run(ADD_DEPS, ['sales/order', 'customer'], backend)
    expect(await read(backend, 'sales.context.ts')).toContain('Order_Module.initialize(base, router, {\n      invoice,\n      customer,\n    })')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('run again, it changes nothing and warns of nothing', async () => {
    const backend = await withInvoice()
    await run(ADD_DEPS, ['sales/order', 'invoice'], backend)
    const again = JSON.parse((await run(ADD_DEPS, ['sales/order', 'invoice', '--json'], backend)).text) as { files: { status: string }[], warnings: string[] }
    expect(again.files.filter(file => file.status !== 'skipped')).toEqual([])
    expect(again.warnings).toEqual([])
  })

  test('each module comes after every module it uses, however they were added', async () => {
    const backend = await moduleProject()
    for (const module of ['alpha', 'charlie', 'bravo']) await run(ADD_MODULE, [`sales/${module}`], backend)
    await run(ADD_DEPS, ['sales/charlie', 'alpha'], backend)
    await run(ADD_DEPS, ['sales/alpha', 'bravo'], backend)
    const modules = await read(backend, 'sales.context.ts')
    expect(modules.indexOf('const bravo =')).toBeLessThan(modules.indexOf('const alpha ='))
    expect(modules.indexOf('const alpha =')).toBeLessThan(modules.indexOf('const charlie ='))
  })

  test('a module using one that uses another: every module\'s tests compile and pass, and no test was edited', async () => {
    const backend = await moduleProject()
    for (const module of ['alpha', 'bravo', 'charlie']) await run(ADD_MODULE, [`sales/${module}`], backend)
    const test = await read(backend, 'modules/bravo/bravo.module.test.ts')
    await run(ADD_DEPS, ['sales/bravo', 'charlie'], backend)
    await run(ADD_DEPS, ['sales/alpha', 'bravo'], backend)
    expect(await read(backend, 'modules/bravo/bravo.module.test.ts')).toBe(test)
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('refuses a cycle through other modules', async () => {
    const backend = await moduleProject()
    for (const module of ['alpha', 'bravo', 'charlie']) await run(ADD_MODULE, [`sales/${module}`], backend)
    await run(ADD_DEPS, ['sales/alpha', 'bravo'], backend)
    await run(ADD_DEPS, ['sales/bravo', 'charlie'], backend)
    expect((await run(ADD_DEPS, ['sales/charlie', 'alpha'], backend)).text).toBe('charlie → alpha → bravo → charlie would be a cycle: modules never use each other, even through others. If it is to check who may go on at a path, the context gives its router a guard (router.guard), and no module uses the other')
  })

  test('refuses a module the context has not, itself, its own context, a cycle, or a path', async () => {
    const backend = await withInvoice()
    expect((await run(ADD_DEPS, ['sales/order', 'customer'], backend)).text).toBe('Neither sales has a module customer nor the backend a context customer: add the module with newt add module sales/customer, or the context with newt add context customer')
    expect((await run(ADD_DEPS, ['sales/order', 'order'], backend)).text).toBe('order cannot use itself')
    expect((await run(ADD_DEPS, ['sales/order', 'sales'], backend)).text).toBe('order is of sales: it uses the other modules of its context by their name, as in newt add deps sales/order <module>')
    await run(ADD_DEPS, ['sales/order', 'invoice'], backend)
    expect((await run(ADD_DEPS, ['sales/invoice', 'order'], backend)).text).toBe('invoice → order → invoice would be a cycle: modules never use each other, even through others. If it is to check who may go on at a path, the context gives its router a guard (router.guard), and no module uses the other')
    expect((await run(ADD_DEPS, ['sales/order', 'auth/user'], backend)).text).toBe('A module uses another context whole, by its name alone, and reaches the modules it publishes through it: newt add deps sales/order auth')
  })
})

describe('newt add deps, of another context', () => {
  async function withAuth(): Promise<string> {
    const backend = await moduleProject()
    await run(ADD_CONTEXT, ['auth'], backend)
    await run(ADD_MODULE, ['auth/user'], backend)
    return backend
  }

  test('order uses auth whole, given by sales.context.ts, opened with auth by contexts.ts, and reaches what auth publishes', async () => {
    const backend = await withAuth()
    expect((await run(ADD_DEPS, ['sales/order', 'auth'], backend)).code).toBe(0)
    expect(await read(backend, 'modules/order/order.deps.ts')).toBe("import type { Auth_Context } from '../../../auth/auth.context'\n\nexport type Order_Deps = {\n  auth: Auth_Context\n}\n")
    const context = await read(backend, 'sales.context.ts')
    expect(context).toContain('export type Sales_Uses = {\n  auth: Auth_Context\n}')
    expect(context).toContain('    uses: Sales_Uses,\n  ): Sales_Context {')
    expect(context).toContain('    uses: Sales_Uses,\n  ): Promise<ContextToRun & { context: Sales_Context }> {')
    expect(context).toContain('Order_Module.initialize(base, router, {\n      auth: uses.auth,\n    })')
    expect(context).toContain('Sales_Context.initialize(base, router, uses)')
    const contexts = await Bun.file(join(backend, 'src/contexts/contexts.ts')).text()
    expect(contexts).toContain('  const auth = await Auth_Context.open(platform, place)\n  const sales = await Sales_Context.open(platform, place, {\n    auth: auth.context,\n  })\n  return [sales, auth]')
    expect(await read(backend, 'modules/order/order.module.test.ts')).toContain("  const auth = await Auth_Context.open(platform, 'memory')\n  used = [auth]")
    const order = join(backend, SALES, 'modules/order/order.module.ts')
    const call = "\n  @UseCase()\n  async userCount(): Promise<number> {\n    return (await this.deps.auth.user.find({})).length\n  }\n\n}\n"
    await Bun.write(order, (await Bun.file(order).text()).replace(/\n\n}\n$/, call))
    expect((await checkGenerated(backend)).join('\n')).toContain("Property 'user' is private")
    expect((await run(PUBLISH, ['auth/user'], backend)).code).toBe(0)
    expect(await checkGenerated(backend)).toEqual([])
  }, 60_000)

  test('run again, it changes nothing', async () => {
    const backend = await withAuth()
    await run(ADD_DEPS, ['sales/order', 'auth'], backend)
    expect((await run(ADD_DEPS, ['sales/order', 'auth'], backend)).text).not.toContain('updated')
  })

  test('refuses a cycle of contexts, and a name taken twice', async () => {
    const backend = await withAuth()
    await run(ADD_DEPS, ['sales/order', 'auth'], backend)
    expect((await run(ADD_DEPS, ['auth/user', 'sales'], backend)).text).toBe('auth → sales → auth would be a cycle: contexts never use each other, even through others')
    await run(ADD_MODULE, ['sales/auth'], backend)
    expect((await run(ADD_DEPS, ['sales/order', 'auth'], backend)).text).toBe('order uses the context auth already, by that name: a module of its context cannot take it too')
  })
})
