import { basename }              from 'node:path'
import { join }                  from 'node:path'
// --------------------------------------------------------
import type { FileChange }       from '../../../commands/command'
import { backendTemplate }       from '../../backend/backend-template/backend-template'
import type { ClusterName }      from '../../backend/clusters'
import type { Stores }           from '../../stores/stores'
import type { TemplateVersions } from '../../template-versions/template-versions'
import { rootPackageJson }       from '../files/root-package-json'
import { workspacePattern }      from '../workspace-pattern/workspace-pattern'

export type MonorepoTemplateOptions = { folder: string, name: string, backend: string, port: number, stores: Stores, versions: TemplateVersions }

/** A monorepo's root in `folder`, its workspaces taking `backend`, and that backend. */
export function monorepoTemplate({ folder, name, backend, port, stores, versions }: MonorepoTemplateOptions): FileChange[] {
  return [
    { action: 'complete-json', path: join(folder, 'package.json'), values: rootPackageJson(name, workspacePattern(backend)) },
    { action: 'ensure-lines', path: join(folder, '.gitignore'), lines: ['node_modules'] },
    ...backendTemplate({ folder: join(folder, backend), name: basename(backend), port, stores, versions }),
  ]
}
