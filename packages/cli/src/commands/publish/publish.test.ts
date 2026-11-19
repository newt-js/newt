import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
import { join }          from 'node:path'
// --------------------------------------------------------
import { runCommand }    from '../../run/run-command/run-command'
import { moduleProject } from '../../testing/module-project/module-project'
import { PUBLISH }       from './publish'

const publish = (args: string[], cwd: string) => runCommand(PUBLISH, args, { cwd, ask: null })

const context = (backend: string) => Bun.file(join(backend, 'src/contexts/sales/sales.context.ts')).text()

describe('newt publish', () => {
  test('makes the field that holds the module public, and says how another context uses it', async () => {
    const backend = await moduleProject()
    expect(await context(backend)).toContain('  private readonly order: Order_Module\n')
    const output = await publish(['sales/order'], backend)
    expect(output.code).toBe(0)
    expect(output.text).toContain('newt add deps <context>/<module> sales, and call this.deps.sales.order')
    expect(await context(backend)).toContain('  public readonly order: Order_Module\n')
  })

  test('run again, it changes nothing', async () => {
    const backend = await moduleProject()
    await publish(['sales/order'], backend)
    const again = JSON.parse((await publish(['sales/order', '--json'], backend)).text) as { files: { status: string }[] }
    expect(again.files.map(file => file.status)).toEqual(['skipped'])
  })

  test('refuses a module the context has not, and anything but <context>/<module>', async () => {
    const backend = await moduleProject()
    expect((await publish(['sales/invoice'], backend)).text).toBe('The context sales has no module invoice: add it with newt add module sales/invoice')
    expect((await publish(['sales/order', 'more'], backend)).text).toBe('newt publish takes the context and the module it publishes, as in newt publish panel/workspace')
  })

  test('a field not as newt wrote it, it changes nothing and says what to write', async () => {
    const backend = await moduleProject()
    const file = join(backend, 'src/contexts/sales/sales.context.ts')
    await Bun.write(file, (await Bun.file(file).text()).replace('  private readonly order: Order_Module', '  readonly order: Order_Module'))
    expect((await publish(['sales/order'], backend)).text).toContain('write public readonly order: Order_Module')
  })
})
