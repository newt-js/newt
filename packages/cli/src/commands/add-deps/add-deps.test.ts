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
  await run(ADD_MODULE, ['sales/invoice'], backend)
  return backend
}

describe('newt add deps', () => {
  test('order uses invoice, given by sales-modules.ts, and its lint, types and tests pass', async () => {
    const backend = await withInvoice()
    expect((await run(ADD_DEPS, ['sales/order', 'invoice'], backend)).code).toBe(0)
    expect(await read(backend, 'modules/order/order.deps.ts')).toBe("import type { Invoice_Module } from '../invoice/invoice.module'\n\nexport type Order_Deps = {\n  invoice: Invoice_Module\n}\n")
    expect(await read(backend, 'modules/order/order.module.ts')).toContain("    super('order', base.useCaseRunner, deps)")
    expect(await read(backend, 'sales-modules.ts')).toContain('  const invoice = Invoice_Module.initialize(base, router)\n  const order = Order_Module.initialize(base, router, { invoice })')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('a second module it uses joins the first', async () => {
    const backend = await withInvoice()
    await run(ADD_MODULE, ['sales/customer'], backend)
    await run(ADD_DEPS, ['sales/order', 'invoice'], backend)
    await run(ADD_DEPS, ['sales/order', 'customer'], backend)
    expect(await read(backend, 'sales-modules.ts')).toContain('Order_Module.initialize(base, router, { invoice, customer })')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('run again, it changes nothing', async () => {
    const backend = await withInvoice()
    await run(ADD_DEPS, ['sales/order', 'invoice'], backend)
    const again = JSON.parse((await run(ADD_DEPS, ['sales/order', 'invoice', '--json'], backend)).text) as { files: { status: string }[] }
    expect(again.files.filter(file => file.status !== 'skipped')).toEqual([])
  })

  test('refuses a module the context has not, itself, a cycle, or another context', async () => {
    const backend = await withInvoice()
    expect((await run(ADD_DEPS, ['sales/order', 'customer'], backend)).text).toBe('The context sales has no module customer: add it with newt add module sales/customer')
    expect((await run(ADD_DEPS, ['sales/order', 'order'], backend)).text).toBe('order cannot use itself')
    await run(ADD_DEPS, ['sales/order', 'invoice'], backend)
    expect((await run(ADD_DEPS, ['sales/invoice', 'order'], backend)).text).toBe('order uses invoice already: two modules never use each other')
    expect((await run(ADD_DEPS, ['sales/order', 'billing/invoice'], backend)).text).toStartWith("A module uses another context's modules")
  })
})
