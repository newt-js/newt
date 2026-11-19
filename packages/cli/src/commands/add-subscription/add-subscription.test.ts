import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
import { join }             from 'node:path'
// --------------------------------------------------------
import { runCommand }       from '../../run/run-command/run-command'
import { checkGenerated }   from '../../testing/check-generated/check-generated'
import { ORDER_MODULE }     from '../../testing/module-project/module-project'
import { moduleProject }    from '../../testing/module-project/module-project'
import { ADD_DEPS }         from '../add-deps/add-deps'
import { ADD_EVENT }        from '../add-event/add-event'
import { ADD_MODULE }       from '../add-module/add-module'
import { ADD_SCHEDULE }     from '../add-schedule/add-schedule'
import { ADD_USE_CASE }     from '../add-use-case/add-use-case'
import type { Command }     from '../command'
import { ADD_SUBSCRIPTION } from './add-subscription'

const run = (command: Command, args: string[], cwd: string) => runCommand(command, args, { cwd, ask: null })

const read = (backend: string, file: string) => Bun.file(join(backend, ORDER_MODULE, file)).text()

describe('newt add subscription', () => {
  test('a use case that runs on an event, whose job the test sees done, and whose lint, types and tests pass', async () => {
    const backend = await moduleProject()
    await run(ADD_USE_CASE, ['sales/orders/order', 'mark-paid'], backend)
    expect((await run(ADD_SUBSCRIPTION, ['sales/orders/order', 'mark-paid', '--on', 'created'], backend)).code).toBe(0)
    expect(await read(backend, 'order.workers.ts')).toContain("  orders.on(orders.events.created, 'markPaid', created => [{ id: created.id }])")
    expect(await read(backend, 'order.module.ts')).toContain('    registerOrderWorkers(module)\n    return module')
    expect(await read(backend, 'order.module.test.ts')).toContain("each.queue === 'orders[order].markPaid_on_orders[order].created')?.status).toBe('done')")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test("on an event added later, it joins the module's events", async () => {
    const backend = await moduleProject()
    await run(ADD_USE_CASE, ['sales/orders/order', 'mark-paid'], backend)
    await run(ADD_EVENT, ['sales/orders/order', 'shipped'], backend)
    const output = JSON.parse((await run(ADD_SUBSCRIPTION, ['sales/orders/order', 'mark-paid', '--on', 'shipped', '--json'], backend)).text) as { warnings: string[] }
    expect(output.warnings).toEqual(['newt cannot tell how to make shipped happen, so it wrote no test of markPaid on it: write one in order.module.test.ts'])
    expect(await read(backend, 'order.module.ts')).toContain('eventsOf(base.bus, { created: Order_Created, shipped: Order_Shipped })')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('two subscriptions share the workers', async () => {
    const backend = await moduleProject()
    await run(ADD_USE_CASE, ['sales/orders/order', 'mark-paid'], backend)
    await run(ADD_USE_CASE, ['sales/orders/order', 'notify'], backend)
    await run(ADD_SUBSCRIPTION, ['sales/orders/order', 'mark-paid', '--on', 'created'], backend)
    await run(ADD_SUBSCRIPTION, ['sales/orders/order', 'notify', '--on', 'created'], backend)
    expect((await read(backend, 'order.module.ts')).match(/registerOrderWorkers\(module\)/g)).toHaveLength(1)
    expect(await read(backend, 'order.workers.ts')).toContain("'notify'")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('refuses a use case or an event the module has not', async () => {
    const backend = await moduleProject()
    expect((await run(ADD_SUBSCRIPTION, ['sales/orders/order', 'notify', '--on', 'created'], backend)).text).toBe('Order_Module has no use case notify: add it with newt add use-case sales/orders/order notify')
    await run(ADD_USE_CASE, ['sales/orders/order', 'notify'], backend)
    expect((await run(ADD_SUBSCRIPTION, ['sales/orders/order', 'notify', '--on', 'paid'], backend)).text).toBe("order has no event paid: if order emits it, add it with newt add event sales/orders/order paid")
  })

  test("a use case that runs on an event of another feature or of another module of its feature, given to its workers, whose lint, types and tests pass", async () => {
    const backend = await moduleProject()
    await run(ADD_MODULE, ['sales/customers/customer'], backend)
    await run(ADD_MODULE, ['sales/orders/invoice'], backend)
    await run(ADD_SCHEDULE, ['sales/orders/order', 'purge', '--cron', '0 3 * * *'], backend)
    await run(ADD_DEPS, ['sales/orders/order', 'customers'], backend)
    await run(ADD_DEPS, ['sales/orders/order', 'invoice'], backend)
    expect((await run(ADD_SUBSCRIPTION, ['sales/orders/order', 'purge', '--on', 'customers/customer/created'], backend)).code).toBe(0)
    await run(ADD_SUBSCRIPTION, ['sales/orders/order', 'purge', '--on', 'orders/invoice/created'], backend)
    expect(await read(backend, 'order.workers.ts')).toContain('export function registerOrderWorkers(orders: Order_Module, deps: Order_Deps): void {\n  orders.on(deps.invoice.events.created, \'purge\')\n  orders.on(deps.customers.customer.events.created, \'purge\')\n  orders.on(orders.purgeSchedule, \'purge\')')
    expect(await read(backend, 'order.module.ts')).toContain('    registerOrderWorkers(module, deps)\n    return module')
    const test = await read(backend, 'order.module.test.ts')
    expect(test).toContain("  await features.customers.customer.create({ name: 'First' })")
    expect(test).toContain("each.queue === 'orders[order].purge_on_customers[customer].created')?.status).toBe('done')")
    expect(test).toContain("each.queue === 'orders[order].purge_on_orders[invoice].created')?.status).toBe('done')")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('on an event of another feature, a use case that takes an input is given its id, and newt says so', async () => {
    const backend = await moduleProject()
    await run(ADD_MODULE, ['sales/customers/customer'], backend)
    await run(ADD_USE_CASE, ['sales/orders/order', 'welcome'], backend)
    expect((await run(ADD_SUBSCRIPTION, ['sales/orders/order', 'welcome', '--on', 'customers/customer/created'], backend)).text).toBe('order does not use customers: let it with newt add deps sales/orders/order customers')
    await run(ADD_DEPS, ['sales/orders/order', 'customers'], backend)
    const output = await run(ADD_SUBSCRIPTION, ['sales/orders/order', 'welcome', '--on', 'customers/customer/created'], backend)
    expect(output.text).toContain("welcome is given the id of customers[customer]'s entity as its id: change what it takes from created, in order.workers.ts")
    expect(await read(backend, 'order.workers.ts')).toContain("  orders.on(deps.customers.customer.events.created, 'welcome', created => [{ id: created.id }])")
    expect((await run(ADD_SUBSCRIPTION, ['sales/orders/order', 'welcome', '--on', 'customers/customer/paid'], backend)).text).toBe('customer has no event paid')
    expect((await run(ADD_SUBSCRIPTION, ['sales/orders/order', 'welcome', '--on', 'payments/payment/created'], backend)).text).toStartWith('sales has no feature payments')
    expect((await run(ADD_SUBSCRIPTION, ['sales/orders/order', 'welcome', '--on', 'orders/order/created'], backend)).text).toBe("order's own events go by their name alone: --on <event>")
  })
})
