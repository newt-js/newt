import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { rm }             from 'node:fs/promises'
import { join }           from 'node:path'
// --------------------------------------------------------
import { runCommand }     from '../../run/run-command/run-command'
import { checkGenerated } from '../../testing/check-generated/check-generated'
import { ORDER_MODULE }   from '../../testing/module-project/module-project'
import { moduleProject }  from '../../testing/module-project/module-project'
import { ADD_EVENT }      from './add-event'

const addEvent = (args: string[], cwd: string) => runCommand(ADD_EVENT, args, { cwd, ask: null })

const SHIP = `
  ship(): void {
    this.trackEvent(new Order_PriceChanged({ id: this.id }))
  }
}
`

describe('newt add event', () => {
  test('an event the entity can emit, whose lint, types and tests pass', async () => {
    const backend = await moduleProject()
    expect((await addEvent(['sales/order', 'price-changed'], backend)).code).toBe(0)
    const event = await Bun.file(join(backend, ORDER_MODULE, 'events/order-price-changed.ts')).text()
    expect(event).toContain("export const Order_PriceChanged = defineEvent('order.priceChanged', OrderSchema.pick({ id: true }))")
    const entity = join(backend, ORDER_MODULE, 'order.ts')
    const code = (await Bun.file(entity).text()).replace(/\n}\n$/, SHIP)
    await Bun.write(entity, `import { Order_PriceChanged } from './events/order-price-changed'\n${code}`)
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('in a module without the schema newt writes, a payload of its own', async () => {
    const backend = await moduleProject()
    await rm(join(backend, ORDER_MODULE, 'order.schema.ts'))
    await addEvent(['sales/order', 'shipped'], backend)
    expect(await Bun.file(join(backend, ORDER_MODULE, 'events/order-shipped.ts')).text()).toContain("defineEvent('order.shipped', z.object({ id: z.string() }))")
  })

  test('says how to emit it and let other modules hear it', async () => {
    const output = await addEvent(['sales/order', 'shipped', '--dry-run'], await moduleProject())
    expect(output.text).toEndWith([
      'Next steps:',
      '  emit it from a method of the entity: this.trackEvent(new Order_Shipped({ id: this.id }))',
      '  let other modules subscribe to it: add shipped: Order_Shipped to eventsOf in order.module.ts',
    ].join('\n'))
  })

  test('refuses a module the context has not, and says how to add it', async () => {
    const backend = await moduleProject()
    expect((await addEvent(['sales/invoice', 'paid'], backend)).text).toBe('The context sales has no module invoice: add it with newt add module sales/invoice')
    expect((await addEvent(['sales/order'], backend)).text).toBe('newt add event takes the module and the event, as in newt add event sales/order shipped')
    expect((await addEvent(['sales/order', 'Shipped'], backend)).text).toStartWith("'Shipped' cannot name an event")
  })

  test("refuses a name that gives one of the module's own types", async () => {
    const backend = await moduleProject()
    for (const name of ['module', 'repository', 'deps']) {
      expect((await addEvent(['sales/order', name], backend)).text).toStartWith(`'${name}' cannot name an event: Order_`)
    }
  })

  test('refuses a name that repeats the module, and says the one to give', async () => {
    const backend = await moduleProject()
    const output = await addEvent(['sales/order', 'order-cancelled'], backend)
    expect(output.code).toBe(1)
    expect(output.text).toStartWith("'order-cancelled' repeats the module: name it cancelled, and it becomes Order_Cancelled in events/order-cancelled.ts")
  })
})
