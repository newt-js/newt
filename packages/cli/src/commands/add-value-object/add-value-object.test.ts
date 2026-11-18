import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
import { join }             from 'node:path'
// --------------------------------------------------------
import { runCommand }       from '../../run/run-command/run-command'
import { checkGenerated }   from '../../testing/check-generated/check-generated'
import { ORDER_MODULE }     from '../../testing/module-project/module-project'
import { moduleProject }    from '../../testing/module-project/module-project'
import { ADD_VALUE_OBJECT } from './add-value-object'

const addValueObject = (args: string[], cwd: string) => runCommand(ADD_VALUE_OBJECT, args, { cwd, ask: null })

describe('newt add value-object', () => {
  test('a value object, its error and its test of a good value and a bad one, whose lint, types and tests pass', async () => {
    const backend = await moduleProject()
    expect((await addValueObject(['sales/orders/order', 'shipping-code'], backend)).code).toBe(0)
    expect(await Bun.file(join(backend, ORDER_MODULE, 'value-objects/shipping-code.ts')).text()).toContain("export const ShippingCode = defineValueObject(z.string().trim().min(1).max(100).brand<'ShippingCode'>(), text => new InvalidShippingCode(text))")
    expect(await Bun.file(join(backend, ORDER_MODULE, 'errors/invalid-shipping-code.ts')).text()).toContain("readonly code = 'orders[order].invalid_shipping_code'")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('says where to put its rules and how to use it', async () => {
    const output = await addValueObject(['sales/orders/order', 'sku', '--dry-run'], await moduleProject())
    expect(output.text).toEndWith([
      'Next steps:',
      '  give its rules to the schema it has: z.string().trim().min(1).max(100) in sku.ts',
      "  use it in the module's schema, Sku.schema, and where a value comes in, Sku.from(text)",
    ].join('\n'))
  })

  test('refuses the id of its module, and a name one of its files has already', async () => {
    const backend = await moduleProject()
    expect((await addValueObject(['sales/orders/order', 'order-id'], backend)).text).toBe('OrderId is there already: every module has its id')
    await Bun.write(join(backend, ORDER_MODULE, 'errors/invalid-email.ts'), 'export class Mine {}\n')
    expect((await addValueObject(['sales/orders/order', 'email'], backend)).text).toStartWith(`${ORDER_MODULE}/errors/invalid-email.ts is there already`)
    expect(await Bun.file(join(backend, ORDER_MODULE, 'value-objects/email.ts')).exists()).toBe(false)
  })
})
