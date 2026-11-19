import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
import { mkdir }           from 'node:fs/promises'
import { mkdtemp }         from 'node:fs/promises'
import { realpath }        from 'node:fs/promises'
import { tmpdir }          from 'node:os'
import { join }            from 'node:path'
// --------------------------------------------------------
import { ADD_BACKEND }     from '../../commands/add-backend/add-backend'
import { INIT }            from '../../commands/init/init'
import { runCommand }      from '../../run/run-command/run-command'
import { generate }        from '../../testing/generate/generate'
import { monorepoProject } from '../../testing/monorepo-project/monorepo-project'
import { findBackend }     from './find-backend'

const backendProject = async () => join(await generate(INIT, ['shop']), 'shop')

async function monorepoWithBackends(...folders: string[]): Promise<string> {
  const root = await monorepoProject(['apps/*', 'packages/*'])
  for (const folder of folders) await runCommand(ADD_BACKEND, [folder], { cwd: root, ask: null })
  return root
}

describe('findBackend', () => {
  test('the backend, from its folder or any folder inside it', async () => {
    const backend = await backendProject()
    const context = join(backend, 'src/contexts/sales/modules/order')
    await mkdir(context, { recursive: true })
    expect(await findBackend(backend)).toBe(backend)
    expect(await findBackend(context)).toBe(backend)
  })

  test("at a monorepo's root, its only backend", async () => {
    const root = await monorepoWithBackends('apps/api')
    expect(await findBackend(root)).toBe(join(root, 'apps/api'))
  })

  test("from a workspace that is not a backend, the monorepo's only backend", async () => {
    const root = await monorepoWithBackends('apps/api')
    expect(await findBackend(join(root, 'packages/utils'))).toBe(join(root, 'apps/api'))
  })

  test('with several, asks which, naming them', async () => {
    const root = await monorepoWithBackends('apps/api', 'apps/web')
    await expect(findBackend(root)).rejects.toThrow('Which backend? This monorepo has apps/api, apps/web: add --backend apps/api')
  })

  test('--backend names it, from where the command runs', async () => {
    const root = await monorepoWithBackends('apps/api', 'apps/web')
    expect(await findBackend(root, 'apps/web')).toBe(join(root, 'apps/web'))
    expect(await findBackend(join(root, 'apps/api'), '../web')).toBe(join(root, 'apps/web'))
  })

  test('--backend that is not a backend', async () => {
    const root = await monorepoWithBackends('apps/api')
    await expect(findBackend(root, 'packages/utils')).rejects.toThrow("packages/utils is not a newt backend: a backend's package.json depends on @newt-js/core, and it has src/contexts/contexts.ts")
  })

  test('a monorepo without backends says how to add one', async () => {
    await expect(findBackend(await monorepoProject())).rejects.toThrow('This monorepo has no newt backend: add one with newt add backend <folder>')
  })

  test('outside any backend or monorepo says how to make one', async () => {
    const folder = await realpath(await mkdtemp(join(tmpdir(), 'newt-cli-nowhere-')))
    await expect(findBackend(folder)).rejects.toThrow('This is not a newt backend: no package.json depending on @newt-js/core here or above. Make one with newt init <name>')
  })
})
