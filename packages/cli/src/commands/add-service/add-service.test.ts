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
import { ADD_SERVICE }    from './add-service'

const addService = (args: string[], cwd: string) => runCommand(ADD_SERVICE, args, { cwd, ask: null })

describe('newt add service', () => {
  test("a function on the module's DTO, whose lint and types pass", async () => {
    const backend = await moduleProject()
    expect((await addService(['sales/order', 'price-rounding'], backend)).code).toBe(0)
    expect(await Bun.file(join(backend, ORDER_MODULE, 'services/price-rounding.ts')).text()).toBe([
      "import type { OrderDTO } from '../order.schema'",
      '',
      'export function priceRounding(order: OrderDTO): OrderDTO {',
      '  return order',
      '}',
      '',
    ].join('\n'))
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('in a module without the schema newt writes, on what it is given', async () => {
    const backend = await moduleProject()
    await rm(join(backend, ORDER_MODULE, 'order.schema.ts'))
    await addService(['sales/order', 'price-rounding'], backend)
    expect(await Bun.file(join(backend, ORDER_MODULE, 'services/price-rounding.ts')).text()).toStartWith('export function priceRounding(order: unknown): unknown {')
  })

  test('says how to use it', async () => {
    const output = await addService(['sales/order', 'price-rounding', '--dry-run'], await moduleProject())
    expect(output.text).toEndWith("Next steps:\n  call it from the use cases that share it: import { priceRounding } from './services/price-rounding'")
  })

  test('refuses a name its function cannot take', async () => {
    expect((await addService(['sales/order', 'delete'], await moduleProject())).text).toStartWith("'delete' cannot name a service")
  })
})
