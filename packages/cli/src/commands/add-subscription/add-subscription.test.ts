import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
import { join }             from 'node:path'
// --------------------------------------------------------
import { runCommand }       from '../../run/run-command/run-command'
import { checkGenerated }   from '../../testing/check-generated/check-generated'
import { ORDER_MODULE }     from '../../testing/module-project/module-project'
import { moduleProject }    from '../../testing/module-project/module-project'
import { ADD_EVENT }        from '../add-event/add-event'
import { ADD_USE_CASE }     from '../add-use-case/add-use-case'
import type { Command }     from '../command'
import { ADD_SUBSCRIPTION } from './add-subscription'

const run = (command: Command, args: string[], cwd: string) => runCommand(command, args, { cwd, ask: null })

const read = (backend: string, file: string) => Bun.file(join(backend, ORDER_MODULE, file)).text()

describe('newt add subscription', () => {
  test('a use case that runs on an event, whose job the test sees done, and whose lint, types and tests pass', async () => {
    const backend = await moduleProject()
    await run(ADD_USE_CASE, ['sales/order', 'mark-paid'], backend)
    expect((await run(ADD_SUBSCRIPTION, ['sales/order', 'mark-paid', '--on', 'created'], backend)).code).toBe(0)
    expect(await read(backend, 'order.workers.ts')).toContain("  orders.on(orders.events.created, 'markPaid', created => [{ id: created.id }])")
    expect(await read(backend, 'order.module.ts')).toContain('    registerOrderWorkers(module)\n    return module')
    expect(await read(backend, 'order.module.test.ts')).toContain("each.queue === 'order.markPaid.on.order.created')?.status).toBe('done')")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test("on an event added later, it joins the module's events", async () => {
    const backend = await moduleProject()
    await run(ADD_USE_CASE, ['sales/order', 'mark-paid'], backend)
    await run(ADD_EVENT, ['sales/order', 'shipped'], backend)
    const output = JSON.parse((await run(ADD_SUBSCRIPTION, ['sales/order', 'mark-paid', '--on', 'shipped', '--json'], backend)).text) as { warnings: string[] }
    expect(output.warnings).toEqual(['newt cannot tell how to make shipped happen, so it wrote no test of markPaid on it: write one in order.module.test.ts'])
    expect(await read(backend, 'order.module.ts')).toContain('eventsOf(base.bus, { created: Order_Created, shipped: Order_Shipped })')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('two subscriptions share the workers', async () => {
    const backend = await moduleProject()
    await run(ADD_USE_CASE, ['sales/order', 'mark-paid'], backend)
    await run(ADD_USE_CASE, ['sales/order', 'notify'], backend)
    await run(ADD_SUBSCRIPTION, ['sales/order', 'mark-paid', '--on', 'created'], backend)
    await run(ADD_SUBSCRIPTION, ['sales/order', 'notify', '--on', 'created'], backend)
    expect((await read(backend, 'order.module.ts')).match(/registerOrderWorkers\(module\)/g)).toHaveLength(1)
    expect(await read(backend, 'order.workers.ts')).toContain("'notify'")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('refuses a use case or an event the module has not', async () => {
    const backend = await moduleProject()
    expect((await run(ADD_SUBSCRIPTION, ['sales/order', 'notify', '--on', 'created'], backend)).text).toBe('Order_Module has no use case notify: add it with newt add use-case sales/order notify')
    await run(ADD_USE_CASE, ['sales/order', 'notify'], backend)
    expect((await run(ADD_SUBSCRIPTION, ['sales/order', 'notify', '--on', 'paid'], backend)).text).toBe("order has no event paid: newt add subscription listens to order's own events; if order emits it, add it with newt add event sales/order paid")
  })
})
