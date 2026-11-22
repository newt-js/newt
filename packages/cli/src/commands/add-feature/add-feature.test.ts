import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { join }           from 'node:path'
// --------------------------------------------------------
import { runCommand }     from '../../run/run-command/run-command'
import { checkGenerated } from '../../testing/check-generated/check-generated'
import { moduleProject }  from '../../testing/module-project/module-project'
import { ADD_APP }        from '../add-app/add-app'
import type { Command }   from '../command'
import { ADD_FEATURE }    from './add-feature'

const run = (command: Command, args: string[], cwd: string) => runCommand(command, args, { cwd, ask: null })

const APP = 'src/contexts/sales/app'

const read = (backend: string, file: string) => Bun.file(join(backend, APP, file)).text()

describe('newt add feature', () => {
  test('a feature at its own address, lazy, with its service and its api, whose lint and types pass', async () => {
    const backend = await moduleProject()
    await run(ADD_APP, ['sales'], backend)
    expect((await run(ADD_FEATURE, ['sales/clients'], backend)).code).toBe(0)
    const routes = await read(backend, 'app.routes.tsx')
    expect(routes).toContain("const Clients = lazy(() => import('./features/clients/clients')")
    expect(routes).toContain('        <Route path="clients" element={<Clients />} />\n        <Route path="*"')
    expect(await read(backend, 'features/clients/clients.tsx')).toContain('<Provide services={[ClientsService]}>')
    expect(await read(backend, 'features/clients/clients.service.ts')).toContain('inject(ClientsApi)')
    expect(await read(backend, 'features/clients/clients.api.ts')).toContain("protected readonly path = '/clients'")
    expect(await checkGenerated(backend, { tests: false })).toEqual([])
  }, 60_000)

  test("--module lists that module a page at a time and adds to it with a form of its create's rules, and its lint and types pass", async () => {
    const backend = await moduleProject()
    await run(ADD_APP, ['sales'], backend)
    const output = await run(ADD_FEATURE, ['sales/orders', '--module', 'order', '--json'], backend)
    expect(JSON.parse(output.text).warnings).toEqual([])
    expect(await read(backend, 'features/orders/orders.api.ts')).toContain('return this.get<Page<OrderDTO>>(\'\', { cursor })')
    expect(await read(backend, 'features/orders/orders.state.ts')).toContain('  name: z.string().trim().min(1).max(100),\n')
    expect(await read(backend, 'features/orders/orders-form.tsx')).toContain("const name = useFormField(orders.form, 'name')")
    expect(await read(backend, 'features/orders/orders-list.tsx')).toContain('<LoadMore list={orders.list} />')
    expect(await read(backend, 'features/orders/orders-list-head.tsx')).toContain('<TableHead>Created at</TableHead>')
    expect(await read(backend, 'features/orders/orders-list-row.tsx')).toContain('<TableCell>{order.name}</TableCell>')
    expect(await checkGenerated(backend, { tests: false })).toEqual([])
  }, 60_000)

  test('a context with no app, a module that is not there, or a feature there already, say what to do', async () => {
    const backend = await moduleProject()
    expect((await run(ADD_FEATURE, ['sales/clients'], backend)).text).toContain('newt add app sales')
    await run(ADD_APP, ['sales'], backend)
    expect((await run(ADD_FEATURE, ['sales/clients', '--module', 'client'], backend)).text).toContain('newt add module sales/client')
    await run(ADD_FEATURE, ['sales/clients'], backend)
    expect((await run(ADD_FEATURE, ['sales/clients'], backend)).text).toContain('has a feature clients already')
  }, 30_000)
})
