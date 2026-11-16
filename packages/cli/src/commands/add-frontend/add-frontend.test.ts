import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { join }           from 'node:path'
// --------------------------------------------------------
import { runCommand }     from '../../run/run-command/run-command'
import { checkGenerated } from '../../testing/check-generated/check-generated'
import { moduleProject }  from '../../testing/module-project/module-project'
import { ADD_FRONTEND }   from './add-frontend'

const addFrontend = (args: string[], cwd: string) => runCommand(ADD_FRONTEND, args, { cwd, ask: null })

const read = (path: string) => Bun.file(path).text()

describe('newt add frontend', () => {
  test('a React frontend the backend serves at /<context>, whose lint, types and tests pass', async () => {
    const backend = await moduleProject()
    expect((await addFrontend(['sales'], backend)).code).toBe(0)
    expect(await read(join(backend, 'src/frontends.ts'))).toContain("  { path: '/sales', app: salesFrontend },")
    expect(await read(join(backend, 'src/backend.ts'))).toContain('serve: { port, health: true, frontend: frontends }')
    expect(await Bun.file(join(backend, 'package.json')).json()).toMatchObject({ dependencies: { 'react': expect.any(String), 'react-dom': expect.any(String) } })
    expect(await Bun.file(join(backend, 'tsconfig.json')).json()).toMatchObject({ exclude: ['node_modules', 'src/contexts/*/frontend'], references: [{ path: './src/contexts/sales/frontend' }] })
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test("the backend's type check checks the frontend too, with its own tsconfig", async () => {
    const backend = await moduleProject()
    await addFrontend(['sales'], backend)
    await Bun.write(join(backend, 'src/contexts/sales/frontend/app.tsx'), 'export function App() {\n  const count: number = \'one\'\n  return <h1>{count}</h1>\n}\n')
    const failures = await checkGenerated(backend)
    expect(failures.map(failure => failure.split(':')[0])).toEqual(['typecheck failed'])
    expect(failures[0]).toContain('src/contexts/sales/frontend/app.tsx')
  }, 30_000)

  test('two frontends, each at its context', async () => {
    const backend = await moduleProject()
    await runCommand((await import('../add-context/add-context')).ADD_CONTEXT, ['billing'], { cwd: backend, ask: null })
    await addFrontend(['sales'], backend)
    await addFrontend(['billing'], backend)
    const frontends = await read(join(backend, 'src/frontends.ts'))
    expect(frontends).toContain("  { path: '/billing', app: billingFrontend },\n  { path: '/sales', app: salesFrontend },")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('--built serves a frontend built elsewhere as it is, its index.html for any page, and its lint, types and tests pass', async () => {
    const backend = await moduleProject()
    await Bun.write(join(backend, '../web/dist/index.html'), '<!doctype html><title>Web</title><div id="root"></div>\n')
    const output = await addFrontend(['sales', '--built', '../web/dist', '--json'], backend)
    expect(JSON.parse(output.text).warnings).toEqual([])
    expect(JSON.parse(output.text).nextSteps).toEqual(['build it into ../web/dist for /sales/, as in vite build --base=/sales/, or its assets answer 404; then bun run dev, and open /sales/'])
    expect(await read(join(backend, 'src/frontends.ts'))).toContain("  { path: '/sales', app: join(import.meta.dir, '../../web/dist') },")
    expect(await Bun.file(join(backend, 'src/contexts/sales/frontend')).exists()).toBe(false)
    expect((await Bun.file(join(backend, 'package.json')).json()).dependencies).not.toHaveProperty('react')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test("--built writes any folder's name as a literal", async () => {
    const backend = await moduleProject()
    await addFrontend(['sales', '--built', "../it's/dist')+String(console.log('PWN'))+('", '--dry-run'], backend)
    await addFrontend(['sales', '--built', "../it's/dist"], backend)
    expect(await read(join(backend, 'src/frontends.ts'))).toContain("app: join(import.meta.dir, '../../it\\'s/dist') }")
  })

  test('--built refuses the backend or a folder that holds it', async () => {
    const backend = await moduleProject()
    for (const folder of ['.', '..', '/']) {
      expect((await addFrontend(['sales', '--built', folder], backend)).text).toBe(`${folder} holds the backend, and everything in it would be served, .env too: give the folder the frontend is built into, as in web/dist`)
    }
  })

  test('refuses a second frontend for a context, built or not', async () => {
    const backend = await moduleProject()
    await addFrontend(['sales', '--built', 'web/dist'], backend)
    await addFrontend(['sales', '--built', 'web/dist'], backend)
    expect((await addFrontend(['sales'], backend)).text).toBe('src/frontends.ts serves a frontend at /sales already: take it out of it first to serve another')
    expect((await addFrontend(['sales', '--built', 'other/dist'], backend)).code).toBe(1)
  })

  test('--built warns while the folder has no index.html, and its tests pass until it is built', async () => {
    const backend = await moduleProject()
    expect((await addFrontend(['sales', '--built', '../web/dist', '--dry-run'], backend)).text).toContain('Warnings:\n  ../web/dist has no index.html yet: the backend answers 503 at /sales until it is built')
    await addFrontend(['sales', '--built', '../web/dist'], backend)
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('run again, it changes nothing', async () => {
    const backend = await moduleProject()
    await addFrontend(['sales'], backend)
    const again = JSON.parse((await addFrontend(['sales', '--json'], backend)).text) as { files: { status: string }[] }
    expect(again.files.filter(file => file.status !== 'skipped')).toEqual([])
  })

  test('refuses a context the backend has not', async () => {
    expect((await addFrontend(['billing'], await moduleProject())).text).toBe('The backend has no context billing: add it with newt add context billing')
  })
})
