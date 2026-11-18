import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { join }           from 'node:path'
// --------------------------------------------------------
import { runCommand }     from '../../run/run-command/run-command'
import { checkGenerated } from '../../testing/check-generated/check-generated'
import { generate }       from '../../testing/generate/generate'
import { moduleProject }  from '../../testing/module-project/module-project'
import { ADD_CONTEXT }    from '../add-context/add-context'
import type { Command }   from '../command'
import { INIT }           from '../init/init'
import { ADD_FEATURE }    from './add-feature'

const run = (command: Command, args: string[], cwd: string) => runCommand(command, args, { cwd, ask: null })

async function backendWithContext(): Promise<string> {
  const backend = join(await generate(INIT, ['shop']), 'shop')
  await run(ADD_CONTEXT, ['sales'], backend)
  return backend
}

const read = (backend: string, file: string) => Bun.file(join(backend, 'src/contexts/sales', file)).text()

describe('newt add feature', () => {
  test('a feature without modules, which its context builds, and whose lint, types and tests pass', async () => {
    const backend = await backendWithContext()
    const output = await run(ADD_FEATURE, ['sales/price-lists'], backend)
    expect(output.code).toBe(0)
    expect(await read(backend, 'features/price-lists/price-lists.feature.ts')).toContain("export function priceListsFeature(base: ContextBase, router: HttpRouter) {\n  return defineFeature('priceLists', base, {\n  })\n}\n\nexport type PriceListsFeature = ReturnType<typeof priceListsFeature>")
    expect(await read(backend, 'sales-features.ts')).toContain('  const priceLists = priceListsFeature(base, router)\n  return {\n    priceLists,\n  }')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('run again, it changes nothing', async () => {
    const backend = await backendWithContext()
    await run(ADD_FEATURE, ['sales/orders'], backend)
    const again = JSON.parse((await run(ADD_FEATURE, ['sales/orders', '--json'], backend)).text) as { files: { status: string }[] }
    expect(again.files.filter(file => file.status !== 'skipped')).toEqual([])
  })

  test('says to add its modules next', async () => {
    const output = await run(ADD_FEATURE, ['sales/orders', '--dry-run'], await backendWithContext())
    expect(output.text).toEndWith('Next steps:\n  add its modules with newt add module sales/orders/<module>')
  })

  test('refuses a context the backend has not, a name a module has, or names that are not', async () => {
    const backend = await moduleProject()
    expect((await run(ADD_FEATURE, ['billing/invoices'], backend)).text).toBe('The backend has no context billing: add it with newt add context billing')
    expect((await run(ADD_FEATURE, ['sales/order'], backend)).text).toStartWith("'order' cannot name a feature of sales: orders has a module of that name")
    expect((await run(ADD_FEATURE, ['sales/Orders'], backend)).text).toStartWith("'Orders' cannot name a feature")
    expect((await run(ADD_FEATURE, ['sales'], backend)).text).toBe('newt add feature takes the context and the feature, as in newt add feature sales/orders')
    expect((await run(ADD_FEATURE, ['sales/orders/order'], backend)).text).toBe('newt add feature takes the context and the feature, as in newt add feature sales/orders')
  })
})
