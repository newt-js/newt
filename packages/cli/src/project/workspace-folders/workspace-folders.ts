import { dirname }            from 'node:path'
import { join }               from 'node:path'
// --------------------------------------------------------
import type { WorkspaceRoot } from '../find-workspace-root/find-workspace-root'

/** The folders of a monorepo's workspaces, absolute and sorted: those its patterns take that have a package.json. */
export async function workspaceFolders(root: WorkspaceRoot): Promise<string[]> {
  const folders = new Set<string>()
  for (const pattern of root.patterns) {
    for await (const path of new Bun.Glob(`${pattern.replace(/\/$/, '')}/package.json`).scan({ cwd: root.folder })) {
      folders.add(join(root.folder, dirname(path)))
    }
  }
  return [...folders].sort()
}
