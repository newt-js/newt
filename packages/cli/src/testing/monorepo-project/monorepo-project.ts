import { mkdtemp }  from 'node:fs/promises'
import { realpath } from 'node:fs/promises'
import { tmpdir }   from 'node:os'
import { join }     from 'node:path'

export const UTILS_INDEX_TS = 'export const sum = (a: number, b: number) => a + b\n'

/** A monorepo newt did not make: its root with workspaces, and a package of its own in packages/utils. */
export async function monorepoProject(workspaces: unknown = ['packages/*']): Promise<string> {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'newt-cli-monorepo-')))
  await Bun.write(join(root, 'package.json'), `${JSON.stringify({ name: 'acme', private: true, workspaces }, null, 2)}\n`)
  await Bun.write(join(root, 'packages/utils/package.json'), `${JSON.stringify({ name: 'utils', type: 'module' }, null, 2)}\n`)
  await Bun.write(join(root, 'packages/utils/index.ts'), UTILS_INDEX_TS)
  return root
}
