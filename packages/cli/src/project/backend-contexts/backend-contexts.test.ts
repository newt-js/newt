import { expect }          from 'bun:test'
import { test }            from 'bun:test'
import { mkdir }           from 'node:fs/promises'
import { mkdtemp }         from 'node:fs/promises'
import { tmpdir }          from 'node:os'
import { join }            from 'node:path'
// --------------------------------------------------------
import { backendContexts } from './backend-contexts'

test('each context with its <name>.context.ts, and the folders of its features and of their modules, those with their <name>.module.ts, sorted', async () => {
  const backend = await mkdtemp(join(tmpdir(), 'newt-cli-contexts-'))
  await Bun.write(join(backend, 'src/contexts/sales/sales.context.ts'), '')
  for (const module of ['orders/order', 'orders/line', 'billing/invoice']) {
    const name = module.split('/')[1]!
    await Bun.write(join(backend, 'src/contexts/sales/features', module, `${name}.module.ts`), '')
  }
  // Folders without their <name>.module.ts are no modules.
  await mkdir(join(backend, 'src/contexts/sales/features/orders/__tests__'), { recursive: true })
  await mkdir(join(backend, 'src/contexts/sales/features/orders/modules/old'), { recursive: true })
  await mkdir(join(backend, 'src/contexts/sales/features/empty'), { recursive: true })
  await Bun.write(join(backend, 'src/contexts/auth/auth.context.ts'), '')
  await mkdir(join(backend, 'src/contexts/shared'), { recursive: true })
  expect(await backendContexts(backend)).toEqual([
    { name: 'auth', features: [] },
    { name: 'sales', features: [{ name: 'billing', modules: ['invoice'] }, { name: 'empty', modules: [] }, { name: 'orders', modules: ['line', 'order'] }] },
  ])
})

test('none in a backend without src/contexts', async () => {
  expect(await backendContexts(await mkdtemp(join(tmpdir(), 'newt-cli-contexts-')))).toEqual([])
})
