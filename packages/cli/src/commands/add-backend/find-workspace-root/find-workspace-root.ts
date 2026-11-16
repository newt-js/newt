import { dirname } from 'node:path'
import { join }    from 'node:path'

export type WorkspaceRoot = { folder: string, patterns: string[], shape: 'list' | 'packages' }

type Manifest = { workspaces?: string[] | { packages?: string[] } }

/** The nearest folder from `cwd` up whose package.json has workspaces: a monorepo's root. */
export async function findWorkspaceRoot(cwd: string): Promise<WorkspaceRoot | null> {
  for (let folder = cwd; ; folder = dirname(folder)) {
    const manifest = Bun.file(join(folder, 'package.json'))
    if (await manifest.exists()) {
      const { workspaces } = await manifest.json().catch(() => ({})) as Manifest
      if (Array.isArray(workspaces)) return { folder, patterns: workspaces, shape: 'list' }
      if (workspaces?.packages) return { folder, patterns: workspaces.packages, shape: 'packages' }
    }
    if (dirname(folder) === folder) return null
  }
}
