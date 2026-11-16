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

const backendProject = async (...stores: string[]) => join(await generate(INIT, ['shop', ...stores]), 'shop')

const addContext = (args: string[], cwd: string) => runCommand(ADD_CONTEXT, args, { cwd, ask: null })

const read = (path: string) => Bun.file(path).text()

const STORAGE_TEST = `import { expect, test } from 'bun:test'
import { HttpRouter } from '@newt-js/core/http'
import { openStorage } from '../../stores'

test('sales keeps a file uploaded to its signed address, and serves it at another', async () => {
  const router = new HttpRouter()
  const storage = (await openStorage('sales', router)).private!
  const upload = await storage.uploadUrl('notes/hello.txt', { expiresIn: 60, contentType: 'text/plain', size: 5 })
  const put = await router.answer(new Request(upload.url, { method: 'PUT', headers: upload.headers, body: 'hello' }))
  expect(put?.ok).toBe(true)
  const download = await storage.signedUrl('notes/hello.txt', { expiresIn: 60, contentType: 'text/plain' })
  expect(await (await router.answer(new Request(download)))?.text()).toBe('hello')
})
`

describe('newt add context', () => {
  test("a context on the backend's stores, opened by the backend, whose lint, types and tests pass", async () => {
    const backend = await backendProject()
    expect((await addContext(['sales'], backend)).code).toBe(0)
    const context = await read(join(backend, 'src/contexts/sales/sales.context.ts'))
    expect(context).toContain("const database = await openDatabase('sales', join(import.meta.dir, 'migrations'))")
    expect(context).toContain("storage: await openStorage('sales', router)")
    expect(await read(join(backend, 'src/contexts.ts'))).toContain('  contexts.push(await Sales_Context.open(platform))\n  return contexts')
    expect(await read(join(backend, '.env'))).toEndWith('\nSALES_DATABASE=data/sales.sqlite\nSALES_FILES=data/files/sales\n')
    expect(await read(join(backend, '.env.test'))).toEndWith('SALES_DATABASE=:memory:\nSALES_FILES=data/test/files/sales\n')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('with local files, its context keeps a file uploaded to its signed address and serves it', async () => {
    const backend = await backendProject()
    await addContext(['sales'], backend)
    await Bun.write(join(backend, 'src/contexts/sales/sales-storage.test.ts'), STORAGE_TEST)
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('two contexts, each opened in the order they were added', async () => {
    const backend = await backendProject()
    await addContext(['sales'], backend)
    await addContext(['web-session'], backend)
    const contexts = await read(join(backend, 'src/contexts.ts'))
    expect(contexts).toContain("import { WebSession_Context } from './contexts/web-session/web-session.context'")
    expect(contexts).toContain('  contexts.push(await Sales_Context.open(platform))\n  contexts.push(await WebSession_Context.open(platform))\n  return contexts')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  for (const db of ['postgres', 'mysql']) {
    test(`on ${db}, its url in .env, whose lint and types pass`, async () => {
      const backend = await backendProject('--db', db)
      const output = await addContext(['sales'], backend)
      expect(output.text).toContain(`create the database of sales in your ${db} server, as SALES_DATABASE_URL in .env says`)
      expect(await read(join(backend, '.env.example'))).toMatch(/SALES_DATABASE_URL=.*\/shop_sales\n/)
      expect(await checkGenerated(backend)).toEqual([])
    }, 30_000)
  }

  test('on s3, its bucket in .env, whose lint and types pass', async () => {
    const backend = await backendProject('--files', 's3')
    expect((await addContext(['sales'], backend)).text).toContain('set SALES_S3_BUCKET in .env to its bucket')
    expect(await read(join(backend, '.env.example'))).toContain('SALES_S3_BUCKET=shop-sales\n')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('in memory, no variables, and its lint, types and tests pass', async () => {
    const backend = await backendProject('--db', 'memory', '--files', 'memory')
    await addContext(['sales'], backend)
    expect(await read(join(backend, '.env'))).not.toContain('SALES_')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('run again, it changes nothing', async () => {
    const backend = await backendProject()
    await addContext(['sales'], backend)
    const again = JSON.parse((await addContext(['sales', '--json'], backend)).text) as { files: { status: string }[] }
    expect(again.files.filter(file => file.status !== 'skipped')).toEqual([])
  })

  test("from a monorepo's root, in its only backend; with several, --backend says which", async () => {
    const root = join(await generate(INIT, ['acme', '--monorepo']), 'acme')
    expect((await addContext(['sales'], root)).code).toBe(0)
    expect(await Bun.file(join(root, 'apps/api/src/contexts/sales/sales.context.ts')).exists()).toBe(true)
    await runCommand(ADD_BACKEND, ['apps/web'], { cwd: root, ask: null })
    expect((await addContext(['billing'], root)).text).toStartWith('Which backend?')
    expect((await addContext(['billing', '--backend', 'apps/web'], root)).code).toBe(0)
  })

  test('when src/contexts.ts is not as newt wrote it, writes nothing and says what it would add', async () => {
    const backend = await backendProject()
    await Bun.write(join(backend, 'src/contexts.ts'), 'export const openContexts = async () => []\n')
    const output = await addContext(['sales', '--json'], backend)
    expect(output.code).toBe(1)
    expect((JSON.parse(output.text) as { error: string }).error).toBe("newt wrote nothing, since its changes go together and some cannot be made:\n- src/contexts.ts is not as newt wrote it, so newt did not change it: add import { Sales_Context } from './contexts/sales/sales.context'; contexts.push(await Sales_Context.open(platform))")
    expect(await Bun.file(join(backend, 'src/contexts/sales/sales.context.ts')).exists()).toBe(false)
  })

  test('refuses a name that is not one, and a backend without the stores newt writes', async () => {
    const backend = await backendProject()
    expect((await addContext(['Sales'], backend)).text).toStartWith("'Sales' cannot name a context")
    expect((await addContext(['api'], backend)).text).toStartWith("'api' cannot name a context")
    expect((await addContext([], backend)).text).toBe('newt add context takes the name of the context, as in newt add context shop')
    await Bun.write(join(backend, 'src/stores.ts'), 'export const mine = 1\n')
    expect((await addContext(['sales'], backend)).text).toStartWith('The backend has no src/stores.ts that newt can read')
  })
})
