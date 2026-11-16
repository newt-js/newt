import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { join }           from 'node:path'
// --------------------------------------------------------
import { runCommand }     from '../../run/run-command/run-command'
import { checkGenerated } from '../../testing/check-generated/check-generated'
import { generate }       from '../../testing/generate/generate'
import { ADD_BACKEND }    from '../add-backend/add-backend'
import { INIT }           from '../init/init'
import { ADD_CONTEXT }    from './add-context'

const backendProject = async () => join(await generate(INIT, ['shop']), 'shop')

const addContext = (args: string[], cwd: string) => runCommand(ADD_CONTEXT, args, { cwd, ask: null })

const read = (path: string) => Bun.file(path).text()

describe('newt add context', () => {
  test('a context on sqlite, opened by the backend, whose lint, types and tests pass', async () => {
    const backend = await backendProject()
    expect((await addContext(['sales'], backend)).code).toBe(0)
    expect(await read(join(backend, 'src/contexts/sales/sales.context.ts'))).toContain("await SqliteDatabase.open({ path: Bun.env.SALES_DATABASE ?? 'data/sales.sqlite'")
    expect(await Bun.file(join(backend, 'src/contexts/sales/migrations/.gitkeep')).exists()).toBe(true)
    expect(await read(join(backend, 'src/contexts.ts'))).toContain('  contexts.push(await Sales_Context.open(platform))\n  return contexts')
    expect(await read(join(backend, '.env'))).toBe('PORT=3000\nSALES_DATABASE=data/sales.sqlite\n')
    expect(await read(join(backend, '.env.test'))).toBe('SALES_DATABASE=:memory:\n')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('two contexts, each opened in the order they were added', async () => {
    const backend = await backendProject()
    await addContext(['sales'], backend)
    await addContext(['web-session', '--db', 'memory'], backend)
    const contexts = await read(join(backend, 'src/contexts.ts'))
    expect(contexts).toContain("import { WebSession_Context } from './contexts/web-session/web-session.context'")
    expect(contexts).toContain('  contexts.push(await Sales_Context.open(platform))\n  contexts.push(await WebSession_Context.open(platform))\n  return contexts')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  for (const db of ['postgres', 'mysql']) {
    test(`a context on ${db}, its url required from .env, whose lint and types pass`, async () => {
      const backend = await backendProject()
      const output = await addContext(['sales', '--db', db], backend)
      expect(output.text).toContain(`create the database of sales in your ${db} server, as SALES_DATABASE_URL in .env says`)
      expect(await read(join(backend, 'src/contexts/sales/sales.context.ts'))).toContain("requiredEnv('SALES_DATABASE_URL')")
      expect(await read(join(backend, '.env.example'))).toContain('SALES_DATABASE_URL=')
      expect(await checkGenerated(backend, { tests: false })).toEqual([])
    }, 30_000)
  }

  test('run again, it changes nothing', async () => {
    const backend = await backendProject()
    await addContext(['sales'], backend)
    const again = JSON.parse((await addContext(['sales', '--json'], backend)).text) as { files: { status: string }[] }
    expect(again.files.filter(file => file.status !== 'skipped')).toEqual([])
  })

  test('from a monorepo\'s root, in its only backend', async () => {
    const root = join(await generate(INIT, ['acme', '--monorepo']), 'acme')
    expect((await addContext(['sales'], root)).code).toBe(0)
    expect(await Bun.file(join(root, 'apps/api/src/contexts/sales/sales.context.ts')).exists()).toBe(true)
  })

  test('with several backends, --backend says which', async () => {
    const root = join(await generate(INIT, ['acme', '--monorepo']), 'acme')
    await runCommand(ADD_BACKEND, ['apps/web'], { cwd: root, ask: null })
    expect((await addContext(['sales'], root)).text).toStartWith('Which backend?')
    expect((await addContext(['sales', '--backend', 'apps/web'], root)).code).toBe(0)
    expect(await Bun.file(join(root, 'apps/web/src/contexts/sales/sales.context.ts')).exists()).toBe(true)
  })

  test('when src/contexts.ts is not as newt wrote it, leaves it and says what to add', async () => {
    const backend = await backendProject()
    await Bun.write(join(backend, 'src/contexts.ts'), 'export const openContexts = async () => []\n')
    const report = JSON.parse((await addContext(['sales', '--json'], backend)).text) as { warnings: string[] }
    expect(report.warnings).toEqual(["src/contexts.ts is not as newt wrote it, so newt did not change it: add import { Sales_Context } from './contexts/sales/sales.context'; contexts.push(await Sales_Context.open(platform))"])
  })

  test('refuses a name that is not one, or a database there is not', async () => {
    const backend = await backendProject()
    expect((await addContext(['Sales'], backend)).text).toStartWith("'Sales' cannot name a context")
    expect((await addContext(['sales', '--db', 'mongo'], backend)).text).toStartWith("'mongo' is not a database")
    expect((await addContext([], backend)).text).toBe('newt add context takes the name of the context, as in newt add context shop')
  })
})
