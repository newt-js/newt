import { dirname }        from 'node:path'
import { join }           from 'node:path'
import { relative }       from 'node:path'
// --------------------------------------------------------
import { workspaceTakes } from '../workspace-takes/workspace-takes'

export type WorkspaceRoot = { folder: string, patterns: string[], shape: 'list' | 'packages' }

type Manifest = { workspaces?: string[] | { packages?: string[] } }

/** The nearest folder from `cwd` up whose package.json has workspaces: a monorepo's root; null when a package on the way is not one of its workspaces. */
export async function findWorkspaceRoot(cwd: string): Promise<WorkspaceRoot | null> {
  let passed: string | undefined
  for (let folder = cwd; ; folder = dirname(folder)) {
    const manifest = Bun.file(join(folder, 'package.json'))
    if (await manifest.exists()) {
      const { workspaces } = await manifest.json().catch(() => ({})) as Manifest
      const found: WorkspaceRoot | null = Array.isArray(workspaces) ? { folder, patterns: workspaces, shape: 'list' }
        : workspaces?.packages ? { folder, patterns: workspaces.packages, shape: 'packages' } : null
      if (found) return passed === undefined || workspaceTakes(found.patterns, relative(folder, passed)) === 'taken' ? found : null
      passed ??= folder
    }
    if (dirname(folder) === folder) return null
  }
}
