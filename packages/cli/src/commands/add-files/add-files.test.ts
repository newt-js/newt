import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { join }           from 'node:path'
// --------------------------------------------------------
import { runCommand }     from '../../run/run-command/run-command'
import { checkGenerated } from '../../testing/check-generated/check-generated'
import { generate }       from '../../testing/generate/generate'
import { ADD_CONTEXT }    from '../add-context/add-context'
import { INIT }           from '../init/init'
import { ADD_FILES }      from './add-files'

const run = (command: typeof ADD_FILES, args: string[], cwd: string) => runCommand(command, args, { cwd, ask: null })

async function backendWithContext(): Promise<string> {
  const backend = join(await generate(INIT, ['shop', '--port', '3010']), 'shop')
  await run(ADD_CONTEXT, ['sales'], backend)
  return backend
}

const read = (path: string) => Bun.file(path).text()

describe('newt add files', () => {
  test('local: the context keeps files and serves them at signed addresses, and its lint, types and tests pass', async () => {
    const backend = await backendWithContext()
    expect((await run(ADD_FILES, ['sales'], backend)).code).toBe(0)
    const context = await read(join(backend, 'src/contexts/sales/sales.context.ts'))
    expect(context).toContain("import { openSalesStorage } from './sales-storage'")
    expect(context).toContain("    const base = new ContextBase({ name: 'sales', platform, database, storage: await openSalesStorage(router) })")
    const env = await read(join(backend, '.env'))
    expect(env).toContain('PUBLIC_URL=http://localhost:3010\n')
    expect(env).toMatch(/SALES_FILES_SECRET=[0-9a-f]{64}\n/)
    expect(await Bun.file(join(backend, 'src/contexts/sales/sales-storage.test.ts')).exists()).toBe(true)
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('memory: whose lint, types and tests pass', async () => {
    const backend = await backendWithContext()
    await run(ADD_FILES, ['sales', 'memory'], backend)
    expect(await read(join(backend, 'src/contexts/sales/sales-storage.ts'))).toContain('new MemoryStorage()')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('s3: its bucket from .env, whose lint and types pass', async () => {
    const backend = await backendWithContext()
    const output = await run(ADD_FILES, ['sales', 's3'], backend)
    expect(output.text).toContain('set the SALES_S3_ variables of .env to your bucket')
    expect(await read(join(backend, '.env.example'))).toContain('SALES_S3_BUCKET=sales\n')
    expect(await checkGenerated(backend, { tests: false })).toEqual([])
  }, 30_000)

  test('newt add context --files does the same at once', async () => {
    const backend = join(await generate(INIT, ['shop']), 'shop')
    await run(ADD_CONTEXT, ['sales', '--files', 'local'], backend)
    expect(await read(join(backend, 'src/contexts/sales/sales.context.ts'))).toContain('storage: await openSalesStorage(router)')
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('run again, it changes nothing', async () => {
    const backend = await backendWithContext()
    await run(ADD_FILES, ['sales'], backend)
    const again = JSON.parse((await run(ADD_FILES, ['sales', '--json'], backend)).text) as { files: { status: string }[] }
    expect(again.files.filter(file => file.status !== 'skipped')).toEqual([])
  })

  test("when the context's file is not as newt wrote it, leaves it and says what to write", async () => {
    const backend = await backendWithContext()
    const path = join(backend, 'src/contexts/sales/sales.context.ts')
    await Bun.write(path, (await read(path)).replace('platform, database }', 'platform, database, clock }'))
    const report = JSON.parse((await run(ADD_FILES, ['sales', '--json'], backend)).text) as { warnings: string[] }
    expect(report.warnings).toEqual(["src/contexts/sales/sales.context.ts is not as newt wrote it, so newt did not change it: write import { openSalesStorage } from './sales-storage'; const base = new ContextBase({ name: 'sales', platform, database, storage: await openSalesStorage(router) })"])
  })

  test('refuses a context the backend has not, or a storage there is not', async () => {
    const backend = await backendWithContext()
    expect((await run(ADD_FILES, ['billing'], backend)).text).toBe('The backend has no context billing: add it with newt add context billing')
    expect((await run(ADD_FILES, ['sales', 'ftp'], backend)).text).toStartWith("'ftp' is not a storage for files")
  })
})
