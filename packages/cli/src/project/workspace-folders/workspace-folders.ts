import { dirname }            from 'node:path'
import { join }               from 'node:path'
// --------------------------------------------------------
import type { WorkspaceRoot } from '../find-workspace-root/find-workspace-root'
import { workspaceTakes }     from '../workspace-takes/workspace-takes'

/** The folders of a monorepo's workspaces, absolute and sorted: those its patterns take that have a package.json. */
export async function workspaceFolders(root: WorkspaceRoot): Promise<string[]> {
  const folders = new Set<string>()
  for (const pattern of root.patterns.filter(each => !each.startsWith('!'))) {
    for await (const path of new Bun.Glob(`${pattern.replace(/^\.\//, '').replace(/\/$/, '')}/package.json`).scan({ cwd: root.folder })) {
      if (workspaceTakes(root.patterns, dirname(path)) === 'taken') folders.add(join(root.folder, dirname(path)))
    }
  }
  return [...folders].sort()
}
