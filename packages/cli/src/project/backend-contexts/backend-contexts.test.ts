import { expect }          from 'bun:test'
import { test }            from 'bun:test'
import { mkdir }           from 'node:fs/promises'
import { mkdtemp }         from 'node:fs/promises'
import { tmpdir }          from 'node:os'
import { join }            from 'node:path'
// --------------------------------------------------------
import { backendContexts } from './backend-contexts'

test('each context with its <name>.context.ts, and the folders of its modules, sorted', async () => {
  const backend = await mkdtemp(join(tmpdir(), 'newt-cli-contexts-'))
  await Bun.write(join(backend, 'src/contexts/sales/sales.context.ts'), '')
  await mkdir(join(backend, 'src/contexts/sales/modules/order'), { recursive: true })
  await mkdir(join(backend, 'src/contexts/sales/modules/invoice'), { recursive: true })
  await Bun.write(join(backend, 'src/contexts/auth/auth.context.ts'), '')
  await mkdir(join(backend, 'src/contexts/shared'), { recursive: true })
  expect(await backendContexts(backend)).toEqual([
    { name: 'auth', modules: [] },
    { name: 'sales', modules: ['invoice', 'order'] },
  ])
})

test('none in a backend without src/contexts', async () => {
  expect(await backendContexts(await mkdtemp(join(tmpdir(), 'newt-cli-contexts-')))).toEqual([])
})
