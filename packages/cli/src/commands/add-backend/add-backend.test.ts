import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
import { mkdtemp }          from 'node:fs/promises'
import { tmpdir }           from 'node:os'
import { join }             from 'node:path'
// --------------------------------------------------------
import { runCommand }       from '../../run/run-command/run-command'
import { checkGenerated }   from '../../testing/check-generated/check-generated'
import { freePorts }        from '../../testing/free-ports/free-ports'
import { generate }         from '../../testing/generate/generate'
import { linkDependencies } from '../../testing/link-dependencies/link-dependencies'
import { UTILS_INDEX_TS }   from '../../testing/monorepo-project/monorepo-project'
import { monorepoProject }  from '../../testing/monorepo-project/monorepo-project'
import { INIT }             from '../init/init'
import { ADD_BACKEND }      from './add-backend'

async function healthOn(port: number): Promise<number> {
  for (let attempt = 0; attempt < 50; attempt++) {
    const status = await fetch(`http://localhost:${port}/api/health`).then(response => response.status, () => null)
    if (status !== null) return status
    await Bun.sleep(100)
  }
  return 0
}

const addBackend = (args: string[], cwd: string) => runCommand(ADD_BACKEND, args, { cwd, ask: null })

describe('newt add backend', () => {
  test('in a monorepo newt did not make, adds a backend whose lint, types and tests pass, and leaves the rest', async () => {
    const root = await monorepoProject()
    const output = await addBackend(['apps/api'], root)
    expect(output.code).toBe(0)
    expect((await Bun.file(join(root, 'package.json')).json()).workspaces).toEqual(['packages/*', 'apps/*'])
    expect((await Bun.file(join(root, 'apps/api/package.json')).json()).name).toBe('api')
    expect(await Bun.file(join(root, 'packages/utils/index.ts')).text()).toBe(UTILS_INDEX_TS)
    expect(await checkGenerated(join(root, 'apps/api'))).toEqual([])
  }, 30_000)

  test('leaves the workspaces alone when they already take the folder', async () => {
    const root = await monorepoProject(['apps/*'])
    const before = await Bun.file(join(root, 'package.json')).json() as { workspaces: string[] }
    await addBackend(['apps/api'], root)
    expect((await Bun.file(join(root, 'package.json')).json() as { workspaces: string[] }).workspaces).toEqual(before.workspaces)
  })

  test("the root depends on newt's cli, so bunx newt runs it there", async () => {
    const root = await monorepoProject(['apps/*'])
    await addBackend(['apps/api'], root)
    expect((await Bun.file(join(root, 'package.json')).json() as { devDependencies: Record<string, string> }).devDependencies).toHaveProperty('@newt-js/cli')
  })

  test('in a monorepo made by newt init --monorepo, its workspaces already take apps/', async () => {
    const root = join(await generate(INIT, ['shop', '--monorepo']), 'shop')
    const report = JSON.parse((await addBackend(['apps/web', '--port', '3010', '--json'], root)).text) as { files: { path: string, status: string }[] }
    expect(report.files.find(file => file.path === 'package.json')?.status).toBe('skipped')
    expect(await Bun.file(join(root, 'apps/web/.env')).text()).toStartWith('PORT=3010\n')
  })

  test('each backend added takes a port of its own, and they run at once', async () => {
    const root = await monorepoProject()
    const port = freePorts([10])
    await addBackend(['apps/orders', '--port', String(port)], root)
    await addBackend(['apps/billing'], root)
    expect(await Bun.file(join(root, 'apps/billing/.env')).text()).toStartWith(`PORT=${port + 10}\n`)
    const backends = await Promise.all(['apps/orders', 'apps/billing'].map(async folder => {
      await linkDependencies(join(root, folder))
      return Bun.spawn([process.execPath, 'src/index.ts'], { cwd: join(root, folder), stdout: 'ignore', stderr: 'ignore' })
    }))
    try {
      for (const each of [port, port + 10]) {
        expect(await healthOn(each)).toBe(200)
      }
    } finally {
      for (const backend of backends) backend.kill()
    }
  }, 30_000)

  test('warns when the port told is another backend\'s', async () => {
    const root = await monorepoProject()
    await addBackend(['apps/orders'], root)
    const report = JSON.parse((await addBackend(['apps/billing', '--port', '3000', '--json'], root)).text) as { warnings: string[] }
    expect(report.warnings).toEqual(["Port 3000 is also apps/orders's: give one of them another PORT in its .env, or a request may reach either"])
  })

  test('works from any folder inside the monorepo', async () => {
    const root = await monorepoProject()
    expect((await addBackend(['../../apps/api'], join(root, 'packages/utils'))).code).toBe(0)
    expect((await Bun.file(join(root, 'package.json')).json()).workspaces).toEqual(['packages/*', 'apps/*'])
    expect(await Bun.file(join(root, 'apps/api/src/backend.ts')).exists()).toBe(true)
  })

  test('run again, it changes nothing', async () => {
    const root = await monorepoProject()
    await addBackend(['apps/api'], root)
    const again = JSON.parse((await addBackend(['apps/api', '--json'], root)).text) as { files: { status: string }[] }
    expect(again.files.filter(file => file.status !== 'skipped')).toEqual([])
  })

  test('says what to do next', async () => {
    const root = await monorepoProject()
    expect((await addBackend(['apps/api', '--dry-run'], root)).text).toEndWith('Next steps:\n  bun install\n  cd apps/api\n  bun run dev')
    expect((await addBackend(['../../apps/api', '--dry-run'], join(root, 'packages/utils'))).text).toEndWith('Next steps:\n  cd ../..\n  bun install\n  cd apps/api\n  bun run dev')
  })

  test('outside a monorepo, says to use newt init', async () => {
    const output = await addBackend(['api'], await mkdtemp(join(tmpdir(), 'newt-cli-alone-')))
    expect(output).toEqual({ code: 1, text: 'This is not a monorepo: no package.json with workspaces here or above. For a backend alone, newt init <name>', json: false })
  })

  test('refuses a folder outside the monorepo, or its root', async () => {
    const root = await monorepoProject()
    expect((await addBackend(['../elsewhere'], root)).text).toEndWith(`is not inside the monorepo at ${root}`)
    expect((await addBackend(['.'], root)).code).toBe(1)
  })

  test('refuses a folder whose name cannot name a backend', async () => {
    const root = await monorepoProject()
    expect((await addBackend(['apps/My Api'], root)).text).toBe("'My Api' cannot name a folder and a package: use lowercase letters, digits and - . _ ~, as in 'my-api'")
  })

  test('refuses a folder named as another package of the monorepo', async () => {
    const root = await monorepoProject(['apps/*', 'services/*'])
    await addBackend(['apps/api'], root)
    expect((await addBackend(['services/api'], root)).text).toBe('apps/api is named api already, and two packages of a monorepo never share a name: put the backend in a folder of another name')
  })

  test("refuses a folder that is another package, and not a backend", async () => {
    const root = await monorepoProject()
    expect((await addBackend(['packages/utils'], root)).text).toBe('packages/utils is a package already, and not a newt backend: put the backend in a folder of its own')
  })

  test('refuses a folder in node_modules, or one that holds a workspace', async () => {
    const root = await monorepoProject(['apps/**', '!apps/legacy'])
    await addBackend(['apps/one'], root)
    expect((await addBackend(['node_modules/x'], root)).text).toBe('node_modules/x is in node_modules, where bun install puts packages: put the backend in a folder of its own, as apps/api')
    expect((await addBackend(['apps'], root)).text).toBe('apps holds the workspace apps/one: put the backend in a folder of its own beside it')
  })

  test('a dependency in a workspace, or a folder a ! pattern leaves out, is no workspace', async () => {
    const root = await monorepoProject(['apps/**', '!apps/legacy'])
    await addBackend(['apps/one'], root)
    await Bun.write(join(root, 'apps/one/node_modules/zod/package.json'), JSON.stringify({ name: 'zod' }))
    await Bun.write(join(root, 'apps/legacy/package.json'), JSON.stringify({ name: 'two' }))
    expect((await addBackend(['apps/zod'], root)).code).toBe(0)
    expect((await addBackend(['apps/two'], root)).code).toBe(0)
  })

  test('takes one folder', async () => {
    const root = await monorepoProject()
    expect((await addBackend([], root)).text).toBe('newt add backend takes the folder of the backend, as in newt add backend apps/api')
    expect((await addBackend(['a', 'b'], root)).code).toBe(1)
  })
})
