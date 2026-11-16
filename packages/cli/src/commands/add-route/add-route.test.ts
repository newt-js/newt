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
    expect(await read(backend, 'order.routes.ts')).toContain("  router.post('/orders/:id/mark-paid', async request => Response.json(await orders.markPaid({ id: OrderId.from(request.params.id) })))")
    expect(await read(backend, 'order.module.test.ts')).toContain("test('POST /orders/:id/mark-paid calls markPaid'")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('a use case that takes nothing and tells nothing answers 204', async () => {
    const backend = await moduleProject()
    await run(ADD_SCHEDULE, ['sales/order', 'purge', '--cron', '0 3 * * *'], backend)
    await run(ADD_ROUTE, ['sales/order', 'purge', '--method', 'delete', '--path', '/orders/expired'], backend)
    expect(await read(backend, 'order.routes.ts')).toContain("  router.delete('/orders/expired', async () => {\n    await orders.purge()\n    return new Response(null, { status: 204 })\n  })")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('a second route that answers 204 is written whole', async () => {
    const backend = await moduleProject()
    await run(ADD_SCHEDULE, ['sales/order', 'purge', '--cron', '0 3 * * *'], backend)
    await run(ADD_SCHEDULE, ['sales/order', 'reindex', '--cron', '0 4 * * *'], backend)
    await run(ADD_ROUTE, ['sales/order', 'purge', '--method', 'delete', '--path', '/orders/purge'], backend)
    await run(ADD_ROUTE, ['sales/order', 'reindex', '--path', '/orders/reindex'], backend)
    expect(await read(backend, 'order.routes.ts')).toContain("  router.post('/orders/reindex', async () => {\n    await orders.reindex()\n    return new Response(null, { status: 204 })\n  })")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('without an id in its path, the body goes to the use case as it came', async () => {
    const backend = await moduleProject()
    await run(ADD_USE_CASE, ['sales/order', 'mark-paid'], backend)
    await run(ADD_ROUTE, ['sales/order', 'mark-paid', '--path', '/orders/paid'], backend)
    expect(await read(backend, 'order.routes.ts')).toContain("router.post('/orders/paid', async request => Response.json(await orders.markPaid(await bodyOf(request))))")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('refuses a use case the module has not, a method or a path that are not', async () => {
    const backend = await moduleProject()
    expect((await run(ADD_ROUTE, ['sales/order', 'mark-paid'], backend)).text).toBe('Order_Module has no use case markPaid: add it with newt add use-case sales/order mark-paid')
    expect((await run(ADD_ROUTE, ['sales/order', 'create', '--method', 'fetch'], backend)).text).toStartWith("'fetch' is not a method")
    expect((await run(ADD_ROUTE, ['sales/order', 'create', '--path', 'orders'], backend)).text).toStartWith("'orders' is not a path")
    expect((await run(ADD_ROUTE, ['sales/order', 'create', '--path', "/x'+String(1)+'"], backend)).text).toStartWith("'/x'+String(1)+'' is not a path")
  })
})
