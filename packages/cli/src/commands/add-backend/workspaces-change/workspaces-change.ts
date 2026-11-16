import { dirname }                 from 'node:path'
import { join }                    from 'node:path'
import { relative }                from 'node:path'
// --------------------------------------------------------
import { workspacePattern }        from '../../../templates/monorepo/workspace-pattern/workspace-pattern'
import type { CompleteJsonChange } from '../../command'
import type { WorkspaceRoot }      from '../find-workspace-root/find-workspace-root'

/** What the root's package.json needs so its workspaces take `folder`: a pattern for its parent, or nothing if one takes it. */
export function workspacesChange(root: WorkspaceRoot, folder: string, cwd: string): CompleteJsonChange | null {
  const inRoot = relative(root.folder, folder)
  if (root.patterns.some(pattern => new Bun.Glob(pattern.replace(/\/$/, '')).match(inRoot))) {
    return null
  }
  const patterns = [workspacePattern(inRoot)]
  return {
    action: 'complete-json',
    path: relative(cwd, join(root.folder, 'package.json')),
    values: { workspaces: root.shape === 'list' ? patterns : { packages: patterns } },
  }
}
