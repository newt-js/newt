import { join }                  from 'node:path'
// --------------------------------------------------------
import type { FileChange }       from '../../../commands/command'
import { ENV_TS }                from '../../context/files/env-ts'
import { STORE_FILES }           from '../../stores/store-files'
import type { Stores }           from '../../stores/stores'
import { storesNeedEnv }         from '../../stores/stores-ts'
import { storesTs }              from '../../stores/stores-ts'
import type { TemplateVersions } from '../../template-versions/template-versions'
import { BUN_INIT_INDEX_TS }     from '../bun-init/bun-init'
import { CLUSTERS }              from '../clusters'
import { AGENTS_MD }             from '../files/agents-md'
import { CLAUDE_MD }             from '../files/claude-md'
import { env }                   from '../files/env'
import { ESLINT_CONFIG_TS }      from '../files/eslint-config-ts'
import { GITIGNORE }             from '../files/gitignore'
import { packageJson }           from '../files/package-json'
import { SRC_BACKEND_TEST_TS }   from '../files/src-backend-test-ts'
import { srcBackendTs }          from '../files/src-backend-ts'
import { SRC_CONTEXTS_TS }       from '../files/src-contexts-ts'
import { SRC_INDEX_TS }          from '../files/src-index-ts'
import { TSCONFIG_JSON }         from '../files/tsconfig-json'

export type BackendTemplateOptions = { folder: string, name: string, port: number, stores: Stores, versions: TemplateVersions }

export function backendTemplate({ folder, name, port, stores, versions }: BackendTemplateOptions): FileChange[] {
  const at = (path: string) => join(folder, path)
  const variables = (example: boolean) => env({ PORT: port, ...CLUSTERS[stores.cluster].env, ...STORE_FILES[stores.files].env(port, example) })
  const created: Record<string, string> = {
    'tsconfig.json': TSCONFIG_JSON,
    'eslint.config.ts': ESLINT_CONFIG_TS,
    '.env': variables(false),
    '.env.example': variables(true),
    'AGENTS.md': AGENTS_MD,
    'src/index.ts': SRC_INDEX_TS,
    'src/backend.ts': srcBackendTs(CLUSTERS[stores.cluster]),
    'src/stores.ts': storesTs(stores),
    ...storesNeedEnv(stores) ? { 'src/env.ts': ENV_TS } : {},
    'src/backend.test.ts': SRC_BACKEND_TEST_TS,
    'src/contexts.ts': SRC_CONTEXTS_TS,
  }
  return [
    { action: 'complete-json', path: at('package.json'), values: packageJson(name, versions) },
    ...Object.entries(created).map(([path, content]): FileChange => ({ action: 'create', path: at(path), content })),
    { action: 'complete-env', path: at('.env.test'), variables: STORE_FILES[stores.files].testEnv },
    { action: 'ensure-lines', path: at('.gitignore'), lines: GITIGNORE },
    { action: 'ensure-lines', path: at('CLAUDE.md'), lines: CLAUDE_MD },
    { action: 'remove-unchanged', path: at('index.ts'), content: BUN_INIT_INDEX_TS, why: 'the backend starts at src/index.ts' },
    { action: 'remove-json-key', path: at('package.json'), key: 'module', value: 'index.ts', whenMissing: at('index.ts') },
  ]
}
