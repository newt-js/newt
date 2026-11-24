import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { join }           from 'node:path'
// --------------------------------------------------------
import { runCommand }     from '../../run/run-command/run-command'
import { checkGenerated } from '../../testing/check-generated/check-generated'
import { moduleProject }  from '../../testing/module-project/module-project'
import { ADD_APP }        from './add-app'

const addApp = (args: string[], cwd: string) => runCommand(ADD_APP, args, { cwd, ask: null })

const read = (path: string) => Bun.file(path).text()

describe('newt add app', () => {
  test('a React app the context serves at /<context>, whose lint, types and tests pass', async () => {
    const backend = await moduleProject()
    expect((await addApp(['sales'], backend)).code).toBe(0)
    const context = await read(join(backend, 'src/contexts/sales/sales.context.ts'))
    expect(context).toMatch(/import \{ default as app \} +from '.\/app\/index.html'/)
    expect(context).toContain('    const context = Sales_Context.initialize(base, router)\n    return { context, router, host, app }')
    expect(await read(join(backend, 'src/contexts/sales/app/base.ts'))).toContain("const PATH = '/sales'\n")
    expect(await read(join(backend, 'src/index.test.ts'))).toContain("test('the backend serves the app of sales'")
    expect(await Bun.file(join(backend, 'src/frontends.ts')).exists()).toBe(false)
    expect(await Bun.file(join(backend, 'package.json')).json()).toMatchObject({ dependencies: { '@newt-js/client': expect.any(String), '@newt-js/react': expect.any(String), 'react': expect.any(String), 'react-dom': expect.any(String), 'react-router': expect.any(String) } })
    expect(await read(join(backend, 'src/contexts/sales/app/features/home/home.tsx'))).toContain('<Heading>Sales</Heading>')
    expect(await read(join(backend, 'src/contexts/sales/app/app.routes.tsx'))).toContain("lazy(() => import('./features/home/home')")
    expect(await read(join(backend, 'src/contexts/sales/app/pages/shell/shell.tsx'))).toContain('<Outlet />')
    expect(await read(join(backend, 'bunfig.toml'))).toContain('plugins = ["bun-plugin-tailwind"]')
    expect(await read(join(backend, 'docs/agents/frontend.md'))).toStartWith('# Frontend\n')
    expect(await read(join(backend, 'AGENTS.md'))).toContain('`docs/agents/frontend.md`')
    expect(await Bun.file(join(backend, 'tsconfig.json')).json()).toMatchObject({ exclude: ['node_modules', 'src/contexts/*/app'], references: [{ path: './src/contexts/sales/app' }] })
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test("the backend's type check checks the app too, with its own tsconfig", async () => {
    const backend = await moduleProject()
    await addApp(['sales'], backend)
    await Bun.write(join(backend, 'src/contexts/sales/app/app.tsx'), "import { Heading } from '@newt-js/react'\n\nexport function App() {\n  const count: number = 'one'\n  return <Heading>{count}</Heading>\n}\n")
    const failures = await checkGenerated(backend)
    expect(failures.map(failure => failure.split(':')[0])).toEqual(['typecheck failed'])
    expect(failures[0]).toContain('src/contexts/sales/app/app.tsx')
  }, 30_000)

  test('the app imports the types its context\'s modules offer, and they type-check', async () => {
    const backend = await moduleProject()
    await addApp(['sales'], backend)
    await Bun.write(join(backend, 'src/contexts/sales/app/app.tsx'), "import { Heading }       from '@newt-js/react'\n// --------------------------------------------------------\nimport type { OrderDTO } from '../modules/order'\n\nexport function App({ order }: { order?: OrderDTO }) {\n  return <Heading>{order?.name}</Heading>\n}\n")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('two apps, each at its context', async () => {
    const backend = await moduleProject()
    await runCommand((await import('../add-context/add-context')).ADD_CONTEXT, ['billing'], { cwd: backend, ask: null })
    await addApp(['sales'], backend)
    await addApp(['billing'], backend)
    expect(await read(join(backend, 'src/contexts/billing/billing.context.ts'))).toContain('router, host, app }')
    expect(await read(join(backend, 'src/index.test.ts'))).toContain("test('the backend serves the app of billing'")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('--built serves an app built elsewhere as it is, its index.html for any page, and its lint, types and tests pass', async () => {
    const backend = await moduleProject()
    await Bun.write(join(backend, '../web/dist/index.html'), '<!doctype html><title>Web</title><div id="root"></div>\n')
    const output = await addApp(['sales', '--built', '../web/dist', '--json'], backend)
    expect(JSON.parse(output.text).warnings).toEqual([])
    expect(JSON.parse(output.text).nextSteps).toEqual(['build it into ../web/dist for /sales/, as in vite build --base=/sales/, or its assets answer 404; then bun run dev, and open /sales/'])
    expect(await read(join(backend, 'src/contexts/sales/sales.context.ts'))).toContain("      app: join(import.meta.dir, '../../../../web/dist'),\n    }")
    expect(await read(join(backend, 'src/index.test.ts'))).toContain("const salesApp = join(import.meta.dir, '../../web/dist', 'index.html')\nconst salesBuilt = await Bun.file(salesApp).exists()\n\ntest.skipIf(!salesBuilt)('serves the built app of sales'")
    expect(await Bun.file(join(backend, 'src/contexts/sales/app')).exists()).toBe(false)
    expect((await Bun.file(join(backend, 'package.json')).json()).dependencies).not.toHaveProperty('react')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test("--built writes any folder's name as a literal", async () => {
    const backend = await moduleProject()
    await addApp(['sales', '--built', "../it's/dist')+String(console.log('PWN'))+('", '--dry-run'], backend)
    await addApp(['sales', '--built', "../it's/dist"], backend)
    expect(await read(join(backend, 'src/contexts/sales/sales.context.ts'))).toContain("app: join(import.meta.dir, '../../../../it\\'s/dist'),\n    }")
  })

  test('--built refuses the backend or a folder that holds it', async () => {
    const backend = await moduleProject()
    for (const folder of ['.', '..', '/']) {
      expect((await addApp(['sales', '--built', folder], backend)).text).toBe(`${folder} holds the backend, and everything in it would be served, .env too: give the folder the app is built into, as in web/dist`)
    }
  })

  test('refuses a second app for a context, built or not', async () => {
    const backend = await moduleProject()
    await addApp(['sales', '--built', 'web/dist'], backend)
    await addApp(['sales', '--built', 'web/dist'], backend)
    expect((await addApp(['sales'], backend)).text).toBe('src/contexts/sales/sales.context.ts serves an app at /sales already: take it out of it first to serve another')
    expect((await addApp(['sales', '--built', 'other/dist'], backend)).code).toBe(1)
  })

  test('--built warns while the folder has no index.html, and its tests pass until it is built', async () => {
    const backend = await moduleProject()
    expect((await addApp(['sales', '--built', '../web/dist', '--dry-run'], backend)).text).toContain('Warnings:\n  ../web/dist has no index.html yet: the backend answers 503 at /sales until it is built')
    await addApp(['sales', '--built', '../web/dist'], backend)
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('run again, it changes nothing', async () => {
    const backend = await moduleProject()
    await addApp(['sales'], backend)
    const again = JSON.parse((await addApp(['sales', '--json'], backend)).text) as { files: { status: string }[] }
    expect(again.files.filter(file => file.status !== 'skipped')).toEqual([])
  })

  test('refuses a context the backend has not', async () => {
    expect((await addApp(['billing'], await moduleProject())).text).toBe('The backend has no context billing: add it with newt add context billing')
  })
})
