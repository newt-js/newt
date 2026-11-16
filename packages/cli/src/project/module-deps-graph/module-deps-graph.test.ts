import { expect }          from 'bun:test'
import { test }            from 'bun:test'
import { mkdtempSync }     from 'node:fs'
import { tmpdir }          from 'node:os'
import { join }            from 'node:path'
// --------------------------------------------------------
import { moduleDepsGraph } from './module-deps-graph'

test('what each module uses, by the types its deps name, whatever their keys', async () => {
  const context = mkdtempSync(join(tmpdir(), 'newt-cli-graph-'))
  await Bun.write(join(context, 'modules/order/order.deps.ts'), 'export type Order_Deps = {\n  bee: Invoice_Module;\n}\n')
  await Bun.write(join(context, 'modules/invoice/invoice.deps.ts'), 'export type Invoice_Deps = { order: Order_Module }\n')
  expect(await moduleDepsGraph(context, ['order', 'invoice', 'customer'])).toEqual(new Map([['order', ['invoice']], ['invoice', ['order']], ['customer', []]]))
})
