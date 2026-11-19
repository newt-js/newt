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
    await run(ADD_USE_CASE, ['sales/orders/order', 'mark-paid'], backend)
    expect((await run(ADD_ROUTE, ['sales/orders/order', 'mark-paid'], backend)).code).toBe(0)
    expect(await read(backend, 'order.routes.ts')).toContain("  router.post('/orders/orders/:id/mark-paid', async request => Response.json(await orders.markPaid({ id: OrderId.from(request.params.id) })))")
    expect(await read(backend, 'order.module.test.ts')).toContain("test('POST /orders/orders/:id/mark-paid calls markPaid'")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('a use case that takes the id itself, as get does, is given the id of its path, and its lint, types and tests pass', async () => {
    const backend = await moduleProject()
    expect((await run(ADD_ROUTE, ['sales/orders/order', 'get', '--method', 'get', '--path', '/orders/orders/:id/again'], backend)).code).toBe(0)
    expect(await read(backend, 'order.routes.ts')).toContain("  router.get('/orders/orders/:id/again', async request => Response.json(await orders.get(request.params.id)))")
    expect(await read(backend, 'order.module.test.ts')).toContain('expect(called).toHaveBeenCalledWith(created.id)')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('its tests fail when the route calls another use case, or is public', async () => {
    const backend = await moduleProject()
    await run(ADD_USE_CASE, ['sales/orders/order', 'mark-paid'], backend)
    await run(ADD_ROUTE, ['sales/orders/order', 'mark-paid'], backend)
    const routes = join(backend, ORDER_MODULE, 'order.routes.ts')
    const written = await Bun.file(routes).text()
    await Bun.write(routes, written.replace('await orders.markPaid({', 'await orders.find({'))
    expect((await checkGenerated(backend, { lint: false })).join('')).toContain('POST /orders/orders/:id/mark-paid calls markPaid')
    await Bun.write(routes, written.replace("OrderId.from(request.params.id) })))", "OrderId.from(request.params.id) })), { public: true })"))
    expect((await checkGenerated(backend, { lint: false })).join('')).toContain('POST /orders/orders/:id/mark-paid answers 401 to who has not signed in')
  }, 30_000)

  test('a use case that takes nothing and tells nothing answers 204', async () => {
    const backend = await moduleProject()
    await run(ADD_SCHEDULE, ['sales/orders/order', 'purge', '--cron', '0 3 * * *'], backend)
    await run(ADD_ROUTE, ['sales/orders/order', 'purge', '--method', 'delete', '--path', '/orders/expired'], backend)
    expect(await read(backend, 'order.routes.ts')).toContain("  router.delete('/orders/expired', async () => {\n    await orders.purge()\n    return new Response(null, { status: 204 })\n  })")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('when its routes file is not as newt wrote it, writes no test for the route either', async () => {
    const backend = await moduleProject()
    await Bun.write(join(backend, ORDER_MODULE, 'order.routes.ts'), 'export const routes = 1\n')
    const before = await read(backend, 'order.module.test.ts')
    expect((await run(ADD_ROUTE, ['sales/orders/order', 'create'], backend)).code).toBe(1)
    expect(await read(backend, 'order.module.test.ts')).toBe(before)
  })

  test('refuses a route registered already, a GET with a body, and a use case of two inputs', async () => {
    const backend = await moduleProject()
    expect((await run(ADD_ROUTE, ['sales/orders/order', 'paginate', '--method', 'get', '--path', '/orders'], backend)).text).toStartWith('paginate takes 2 inputs')
    expect((await run(ADD_ROUTE, ['sales/orders/order', 'create', '--method', 'get', '--path', '/new-orders'], backend)).text).toStartWith('create takes an input, and a GET has no body')
    await run(ADD_USE_CASE, ['sales/orders/order', 'archive'], backend)
    expect((await run(ADD_ROUTE, ['sales/orders/order', 'archive', '--path', '/orders/orders'], backend)).text).toBe(`${ORDER_MODULE}/order.routes.ts has POST /orders/orders already: give the route another --path or --method`)
  })

  test('a route registered already in other quotes, or with its param named otherwise, is the same route', async () => {
    const backend = await moduleProject()
    await run(ADD_USE_CASE, ['sales/orders/order', 'archive'], backend)
    const routes = join(backend, ORDER_MODULE, 'order.routes.ts')
    await Bun.write(routes, (await Bun.file(routes).text()).replace("router.get('/orders/orders/:id'", 'router.get("/orders/orders/:orderId"'))
    expect((await run(ADD_ROUTE, ['sales/orders/order', 'archive', '--method', 'get', '--path', '/orders/orders/:id'], backend)).text).toBe(`${ORDER_MODULE}/order.routes.ts has GET /orders/orders/:id already: give the route another --path or --method`)
  })

  test('run again, it is up to date', async () => {
    const backend = await moduleProject()
    await run(ADD_USE_CASE, ['sales/orders/order', 'cancel'], backend)
    await run(ADD_ROUTE, ['sales/orders/order', 'cancel', '--method', 'patch'], backend)
    const routes = await read(backend, 'order.routes.ts')
    const again = await run(ADD_ROUTE, ['sales/orders/order', 'cancel', '--method', 'patch', '--json'], backend)
    expect(again.code).toBe(0)
    expect((JSON.parse(again.text) as { files: { status: string }[] }).files.every(file => file.status === 'skipped')).toBe(true)
    expect(await read(backend, 'order.routes.ts')).toBe(routes)
  })

  test('says when it writes no test for a route with a body', async () => {
    const backend = await moduleProject()
    const report = JSON.parse((await run(ADD_ROUTE, ['sales/orders/order', 'create', '--path', '/orders/new', '--json'], backend)).text) as { warnings: string[] }
    expect(report.warnings).toEqual(['POST /orders/new takes a body, so newt wrote no test for it: write one in order.module.test.ts'])
  })

  test('a second route that answers 204 is written whole', async () => {
    const backend = await moduleProject()
    await run(ADD_SCHEDULE, ['sales/orders/order', 'purge', '--cron', '0 3 * * *'], backend)
    await run(ADD_SCHEDULE, ['sales/orders/order', 'reindex', '--cron', '0 4 * * *'], backend)
    await run(ADD_ROUTE, ['sales/orders/order', 'purge', '--method', 'delete', '--path', '/orders/purge'], backend)
    await run(ADD_ROUTE, ['sales/orders/order', 'reindex', '--path', '/orders/reindex'], backend)
    expect(await read(backend, 'order.routes.ts')).toContain("  router.post('/orders/reindex', async () => {\n    await orders.reindex()\n    return new Response(null, { status: 204 })\n  })")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('without an id in its path, the body goes to the use case as it came', async () => {
    const backend = await moduleProject()
    await run(ADD_USE_CASE, ['sales/orders/order', 'mark-paid'], backend)
    await run(ADD_ROUTE, ['sales/orders/order', 'mark-paid', '--path', '/orders/paid'], backend)
    expect(await read(backend, 'order.routes.ts')).toContain("router.post('/orders/paid', async request => Response.json(await orders.markPaid(await bodyOf(request))))")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('refuses a use case the module has not, a method or a path that are not', async () => {
    const backend = await moduleProject()
    expect((await run(ADD_ROUTE, ['sales/orders/order', 'mark-paid'], backend)).text).toBe('Order_Module has no use case markPaid: add it with newt add use-case sales/orders/order mark-paid')
    expect((await run(ADD_ROUTE, ['sales/orders/order', 'create', '--method', 'fetch'], backend)).text).toStartWith("'fetch' is not a method")
    expect((await run(ADD_ROUTE, ['sales/orders/order', 'create', '--path', 'orders'], backend)).text).toStartWith("'orders' is not a path")
    expect((await run(ADD_ROUTE, ['sales/orders/order', 'create', '--path', "/x'+String(1)+'"], backend)).text).toStartWith("'/x'+String(1)+'' is not a path")
  })

  test('refuses a path that repeats its context, or where its files are served', async () => {
    const backend = await moduleProject()
    expect((await run(ADD_ROUTE, ['sales/orders/order', 'create', '--path', '/sales/orders/new'], backend)).text).toBe("'/sales/orders/new' starts with /sales, which every route of the context is under already: give --path /orders/new")
    expect((await run(ADD_ROUTE, ['sales/orders/order', 'create', '--path', '/files/x'], backend)).text).toBe("'/files/x' is where the files of sales are served: give the route another --path")
  })

  test('refuses /api, empty segments, a last / and a param given twice', async () => {
    const backend = await moduleProject()
    const refused = async (path: string) => (await run(ADD_ROUTE, ['sales/orders/order', 'create', '--path', path], backend)).text
    expect(await refused('/api/orders/new')).toBe("'/api/orders/new' starts with /api, which every route is under already: give --path /orders/new")
    expect(await refused('/orders//new')).toBe("'/orders//new' has an empty segment: no // and no / at the end")
    expect(await refused('/orders/')).toBe("'/orders/' has an empty segment: no // and no / at the end")
    expect(await refused('/orders/:id/:id')).toBe("'/orders/:id/:id' has :id twice: name each param once")
  })

  test('a param that only starts like :id is not the id, and says it is not used', async () => {
    const backend = await moduleProject()
    await run(ADD_USE_CASE, ['sales/orders/order', 'mark-paid'], backend)
    const report = JSON.parse((await run(ADD_ROUTE, ['sales/orders/order', 'mark-paid', '--path', '/orders/:idx/pay', '--json'], backend)).text) as { warnings: string[] }
    expect(report.warnings).toContain(':idx of /orders/:idx/pay is not given to markPaid: read it in order.routes.ts, request.params.idx')
    expect(await read(backend, 'order.routes.ts')).toContain("router.post('/orders/:idx/pay', async request => Response.json(await orders.markPaid(await bodyOf(request))))")
    expect(await checkGenerated(backend, { tests: false })).toEqual([])
  }, 30_000)
})
