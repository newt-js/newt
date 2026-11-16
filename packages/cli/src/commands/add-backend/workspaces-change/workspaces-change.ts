import { join }                    from 'node:path'
import { relative }                from 'node:path'
// --------------------------------------------------------
import type { WorkspaceRoot }      from '../../../project/find-workspace-root/find-workspace-root'
import { workspaceTakes }          from '../../../project/workspace-takes/workspace-takes'
import { workspacePattern }        from '../../../templates/monorepo/workspace-pattern/workspace-pattern'
import type { CompleteJsonChange } from '../../command'
import { CommandError }            from '../../command-error/command-error'

/** What the root's package.json needs so its workspaces take `folder`: a pattern for its parent, or nothing if one takes it. */
export function workspacesChange(root: WorkspaceRoot, folder: string, cwd: string): CompleteJsonChange | null {
  const inRoot = relative(root.folder, folder)
  const taken = workspaceTakes(root.patterns, inRoot)
  if (taken === 'left out') {
    throw new CommandError(`The workspaces of package.json leave ${inRoot} out with a ! pattern: take it out to add the backend there`)
  }
  if (taken === 'taken') return null
  const patterns = [workspacePattern(inRoot)]
  return {
    action: 'complete-json',
    path: relative(cwd, join(root.folder, 'package.json')),
    values: { workspaces: root.shape === 'list' ? patterns : { packages: patterns } },
  }
}
