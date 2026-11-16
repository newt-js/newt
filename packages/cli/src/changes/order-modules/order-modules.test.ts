import { expect }       from 'bun:test'
import { test }         from 'bun:test'
import { mkdtempSync }  from 'node:fs'
import { tmpdir }       from 'node:os'
import { join }         from 'node:path'
// --------------------------------------------------------
import { diskFiles }    from '../../testing/disk-files/disk-files'
import { orderModules } from './order-modules'

async function ordered(content: string): Promise<string> {
  const cwd = mkdtempSync(join(tmpdir(), 'newt-cli-order-'))
  await Bun.write(join(cwd, 'm.ts'), content)
  await orderModules('m.ts', diskFiles(cwd))
  return Bun.file(join(cwd, 'm.ts')).text()
}

test('each module after the ones it uses, each with the comments above it', async () => {
  const text = 'export function shopModules(base, router) {\n  // the order\n  const order = Order_Module.initialize(base, router, { invoice })\n  // the invoice\n  const invoice = Invoice_Module.initialize(base, router)\n  return { order, invoice }\n}\n'
  expect(await ordered(text)).toBe('export function shopModules(base, router) {\n  // the invoice\n  const invoice = Invoice_Module.initialize(base, router)\n  // the order\n  const order = Order_Module.initialize(base, router, { invoice })\n  return { order, invoice }\n}\n')
})

test('in order already, nothing changes', async () => {
  const text = 'export function shopModules(base, router) {\n  const invoice = Invoice_Module.initialize(base, router)\n  const order = Order_Module.initialize(base, router, { invoice })\n  return { order, invoice }\n}\n'
  expect(await ordered(text)).toBe(text)
})
