import { dirname }            from 'node:path'
import { join }               from 'node:path'
// --------------------------------------------------------
import { envValues }          from '../../../project/env-values/env-values'
import type { WorkspaceRoot } from '../../../project/find-workspace-root/find-workspace-root'

const ENV_FILES = ['.env', '.env.local', '.env.example']

/** The ports the monorepo's workspaces serve on, by their .env, and which workspace has each. */
export async function usedPorts(root: WorkspaceRoot): Promise<Map<number, string>> {
  const used = new Map<number, string>()
  for (const pattern of root.patterns) {
    for (const envFile of ENV_FILES) {
      for await (const path of new Bun.Glob(`${pattern.replace(/\/$/, '')}/${envFile}`).scan({ cwd: root.folder, dot: true })) {
        const port = Number(envValues(await Bun.file(join(root.folder, path)).text()).get('PORT'))
        if (Number.isInteger(port) && port > 0 && !used.has(port)) used.set(port, dirname(path))
      }
    }
  }
  return used
}
