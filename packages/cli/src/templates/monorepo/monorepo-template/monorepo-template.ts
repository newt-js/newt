import { basename }               from 'node:path'
import { join }                   from 'node:path'
// --------------------------------------------------------
import type { FileChange }        from '../../../commands/command'
import { backendTemplate }        from '../../backend/backend-template/backend-template'
import { BUN_INIT_INDEX_TS }      from '../../backend/bun-init/bun-init'
import { BUN_INIT_TSCONFIG_JSON } from '../../backend/bun-init/bun-init'
import type { ClusterName }       from '../../backend/clusters'
import { CLAUDE_MD }              from '../../backend/files/claude-md'
import type { Stores }            from '../../stores/stores'
import type { TemplateVersions }  from '../../template-versions/template-versions'
import { ROOT_AGENTS_MD }         from '../files/root-agents-md'
import { rootPackageJson }        from '../files/root-package-json'
import { workspacePattern }       from '../workspace-pattern/workspace-pattern'

export type MonorepoTemplateOptions = { folder: string, name: string, backend: string, port: number, stores: Stores, versions: TemplateVersions }

/** A monorepo's root in `folder`, its workspaces taking `backend`, and that backend. */
export function monorepoTemplate({ folder, name, backend, port, stores, versions }: MonorepoTemplateOptions): FileChange[] {
  const at = (path: string) => join(folder, path)
  return [
    { action: 'complete-json', path: at('package.json'), values: rootPackageJson(name, workspacePattern(backend), versions) },
    { action: 'create', path: at('AGENTS.md'), content: ROOT_AGENTS_MD },
    { action: 'ensure-lines', path: at('.gitignore'), lines: ['node_modules'] },
    { action: 'ensure-lines', path: at('CLAUDE.md'), lines: CLAUDE_MD },
    { action: 'remove-unchanged', path: at('index.ts'), content: BUN_INIT_INDEX_TS, why: 'the backends start in their workspaces' },
    { action: 'remove-json-key', path: at('package.json'), key: 'module', value: 'index.ts', whenMissing: at('index.ts') },
    { action: 'remove-unchanged', path: at('tsconfig.json'), content: BUN_INIT_TSCONFIG_JSON, why: 'each backend has its own tsconfig.json' },
    ...backendTemplate({ folder: at(backend), name: basename(backend), port, stores, versions, inMonorepo: true }),
  ]
}
