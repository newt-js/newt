import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { join }           from 'node:path'
// --------------------------------------------------------
import { runCommand }     from '../../run/run-command/run-command'
import { checkGenerated } from '../../testing/check-generated/check-generated'
import { ORDER_MODULE }   from '../../testing/module-project/module-project'
import { moduleProject }  from '../../testing/module-project/module-project'
import { ADD_SCHEDULE }   from '../add-schedule/add-schedule'
import { ADD_USE_CASE }   from '../add-use-case/add-use-case'
import type { Command }   from '../command'
import { ADD_ROUTE }      from './add-route'

const run = (command: Command, args: string[], cwd: string) => runCommand(command, args, { cwd, ask: null })

const read = (backend: string, file: string) => Bun.file(join(backend, ORDER_MODULE, file)).text()

describe('newt add route', () => {
  test('a route that calls a use case with the id of its path, which a test calls, and whose lint, types and tests pass', async () => {
    const backend = await moduleProject()
    await run(ADD_USE_CASE, ['sales/order', 'mark-paid'], backend)
    expect((await run(ADD_ROUTE, ['sales/order', 'mark-paid'], backend)).code).toBe(0)
    expect(await read(backend, 'order.routes.ts')).toContain("  router.post('/sales/orders/:id/mark-paid', async request => Response.json(await orders.markPaid({ id: OrderId.from(request.params.id) })))")
    expect(await read(backend, 'order.module.test.ts')).toContain("test('POST /sales/orders/:id/mark-paid calls markPaid'")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('a use case that takes nothing and tells nothing answers 204', async () => {
    const backend = await moduleProject()
    await run(ADD_SCHEDULE, ['sales/order', 'purge', '--cron', '0 3 * * *'], backend)
    await run(ADD_ROUTE, ['sales/order', 'purge', '--method', 'delete', '--path', '/sales/orders/expired'], backend)
    expect(await read(backend, 'order.routes.ts')).toContain("  router.delete('/sales/orders/expired', async () => {\n    await orders.purge()\n    return new Response(null, { status: 204 })\n  })")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('when its routes file is not as newt wrote it, writes no test for the route either', async () => {
    const backend = await moduleProject()
    await Bun.write(join(backend, ORDER_MODULE, 'order.routes.ts'), 'export const routes = 1\n')
    const before = await read(backend, 'order.module.test.ts')
    expect((await run(ADD_ROUTE, ['sales/order', 'create'], backend)).code).toBe(1)
    expect(await read(backend, 'order.module.test.ts')).toBe(before)
  })

  test('refuses a route registered already, a GET with a body, and a use case of two inputs', async () => {
    const backend = await moduleProject()
    expect((await run(ADD_ROUTE, ['sales/order', 'paginate', '--method', 'get', '--path', '/sales/orders'], backend)).text).toStartWith('paginate takes 2 inputs')
    expect((await run(ADD_ROUTE, ['sales/order', 'create', '--method', 'get', '--path', '/sales/new-orders'], backend)).text).toStartWith('create takes an input, and a GET has no body')
    expect((await run(ADD_ROUTE, ['sales/order', 'create', '--path', '/sales/orders'], backend)).text).toBe(`${ORDER_MODULE}/order.routes.ts has POST /sales/orders already: give the route another --path or --method`)
  })

  test('says when it writes no test for a route with a body', async () => {
    const backend = await moduleProject()
    const report = JSON.parse((await run(ADD_ROUTE, ['sales/order', 'create', '--path', '/sales/orders/new', '--json'], backend)).text) as { warnings: string[] }
    expect(report.warnings).toEqual(['POST /sales/orders/new takes a body, so newt wrote no test for it: write one in order.module.test.ts'])
  })

  test('a second route that answers 204 is written whole', async () => {
    const backend = await moduleProject()
    await run(ADD_SCHEDULE, ['sales/order', 'purge', '--cron', '0 3 * * *'], backend)
    await run(ADD_SCHEDULE, ['sales/order', 'reindex', '--cron', '0 4 * * *'], backend)
    await run(ADD_ROUTE, ['sales/order', 'purge', '--method', 'delete', '--path', '/sales/orders/purge'], backend)
    await run(ADD_ROUTE, ['sales/order', 'reindex', '--path', '/sales/orders/reindex'], backend)
    expect(await read(backend, 'order.routes.ts')).toContain("  router.post('/sales/orders/reindex', async () => {\n    await orders.reindex()\n    return new Response(null, { status: 204 })\n  })")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('without an id in its path, the body goes to the use case as it came', async () => {
    const backend = await moduleProject()
    await run(ADD_USE_CASE, ['sales/order', 'mark-paid'], backend)
    await run(ADD_ROUTE, ['sales/order', 'mark-paid', '--path', '/sales/orders/paid'], backend)
    expect(await read(backend, 'order.routes.ts')).toContain("router.post('/sales/orders/paid', async request => Response.json(await orders.markPaid(await bodyOf(request))))")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('refuses a use case the module has not, a method or a path that are not', async () => {
    const backend = await moduleProject()
    expect((await run(ADD_ROUTE, ['sales/order', 'mark-paid'], backend)).text).toBe('Order_Module has no use case markPaid: add it with newt add use-case sales/order mark-paid')
    expect((await run(ADD_ROUTE, ['sales/order', 'create', '--method', 'fetch'], backend)).text).toStartWith("'fetch' is not a method")
    expect((await run(ADD_ROUTE, ['sales/order', 'create', '--path', 'orders'], backend)).text).toStartWith("'orders' is not a path")
    expect((await run(ADD_ROUTE, ['sales/order', 'create', '--path', "/x'+String(1)+'"], backend)).text).toStartWith("'/x'+String(1)+'' is not a path")
  })

  test("refuses a path outside its context's", async () => {
    const backend = await moduleProject()
    expect((await run(ADD_ROUTE, ['sales/order', 'create', '--path', '/orders/new'], backend)).text).toBe("'/orders/new' is not under /sales/: a module's routes start with its context")
  })
})
