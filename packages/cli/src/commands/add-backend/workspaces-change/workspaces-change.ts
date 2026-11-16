import { dirname }                 from 'node:path'
import { join }                    from 'node:path'
import { relative }                from 'node:path'
// --------------------------------------------------------
import type { WorkspaceRoot }      from '../../../project/find-workspace-root/find-workspace-root'
import { workspacePattern }        from '../../../templates/monorepo/workspace-pattern/workspace-pattern'
import type { CompleteJsonChange } from '../../command'
import { CommandError }            from '../../command-error/command-error'

/** What the root's package.json needs so its workspaces take `folder`: a pattern for its parent, or nothing if one takes it. */
export function workspacesChange(root: WorkspaceRoot, folder: string, cwd: string): CompleteJsonChange | null {
  const inRoot = relative(root.folder, folder)
  const matches = (pattern: string) => new Bun.Glob(pattern.replace(/^\.\//, '').replace(/\/$/, '')).match(inRoot)
  const excluding = root.patterns.find(pattern => pattern.startsWith('!') && matches(pattern.slice(1)))
  if (excluding) {
    throw new CommandError(`The workspaces of package.json leave ${inRoot} out with "${excluding}": take it out to add the backend there`)
  }
  if (root.patterns.some(pattern => !pattern.startsWith('!') && matches(pattern))) {
    return null
  }
  const patterns = [workspacePattern(inRoot)]
  return {
    action: 'complete-json',
    path: relative(cwd, join(root.folder, 'package.json')),
    values: { workspaces: root.shape === 'list' ? patterns : { packages: patterns } },
  }
}
