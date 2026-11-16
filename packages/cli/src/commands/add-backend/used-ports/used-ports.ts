import { dirname }            from 'node:path'
import { join }               from 'node:path'
// --------------------------------------------------------
import type { WorkspaceRoot } from '../../../project/find-workspace-root/find-workspace-root'

const ENV_FILES = ['.env', '.env.example']

const PORT = /^PORT=(\d+)\s*$/m

/** The ports the monorepo's workspaces serve on, by their .env, and which workspace has each. */
export async function usedPorts(root: WorkspaceRoot): Promise<Map<number, string>> {
  const used = new Map<number, string>()
  for (const pattern of root.patterns) {
    for (const envFile of ENV_FILES) {
      for await (const path of new Bun.Glob(`${pattern.replace(/\/$/, '')}/${envFile}`).scan({ cwd: root.folder, dot: true })) {
        const port = PORT.exec(await Bun.file(join(root.folder, path)).text())?.[1]
        if (port !== undefined && !used.has(Number(port))) used.set(Number(port), dirname(path))
      }
    }
  }
  return used
}
