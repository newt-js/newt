import { join }                  from 'node:path'
// --------------------------------------------------------
import type { FileChange }       from '../../../commands/command'
import { STORE_FILES }           from '../../stores/store-files'
import type { Stores }           from '../../stores/stores'
import { storesNeedEnv }         from '../../stores/stores-ts'
import { storesTs }              from '../../stores/stores-ts'
import type { TemplateVersions } from '../../template-versions/template-versions'
import { BUN_INIT_INDEX_TS }     from '../bun-init/bun-init'
import { CLUSTERS }              from '../clusters'
import { AGENTS_MD }             from '../files/agents-md'
import { CLAUDE_MD }             from '../files/claude-md'
import { ENV_TS }                from '../files/env-ts'
import { ESLINT_CONFIG_TS }      from '../files/eslint-config-ts'
import { GITIGNORE }             from '../files/gitignore'
import { packageJson }           from '../files/package-json'
import { SRC_BACKEND_TEST_TS }   from '../files/src-backend-test-ts'
import { srcBackendTs }          from '../files/src-backend-ts'
import { SRC_CONTEXTS_TS }       from '../files/src-contexts-ts'
import { SRC_INDEX_TS }          from '../files/src-index-ts'
import { TSCONFIG_JSON }         from '../files/tsconfig-json'

const TSCONFIG_KEPT = { needs: ['"bun"', '"bundler"'], warning: 'newt\'s code needs in its compilerOptions types: ["bun"], module: "Preserve" and moduleResolution: "bundler"' }

const INDEX_KEPT = { needs: ['startBackend'], warning: 'it should start the backend: import { startBackend } from \'./backend\' and await startBackend(Number(Bun.env.PORT || 3000))' }

export type BackendTemplateOptions = { folder: string, name: string, port: number, stores: Stores, versions: TemplateVersions, inMonorepo?: boolean }

export function backendTemplate({ folder, name, port, stores, versions, inMonorepo = false }: BackendTemplateOptions): FileChange[] {
  const at = (path: string) => join(folder, path)
  const variables = (example: boolean) => ({ PORT: String(port), ...CLUSTERS[stores.cluster].env, ...STORE_FILES[stores.files].env(port, example) })
  const created: Record<string, string> = {
    'eslint.config.ts': ESLINT_CONFIG_TS,
    'AGENTS.md': AGENTS_MD,
    'src/backend.ts': srcBackendTs(CLUSTERS[stores.cluster]),
    'src/stores.ts': storesTs(stores),
    ...storesNeedEnv(stores) ? { 'src/env.ts': ENV_TS } : {},
    'src/backend.test.ts': SRC_BACKEND_TEST_TS,
    'src/contexts.ts': SRC_CONTEXTS_TS,
  }
  return [
    { action: 'complete-json', path: at('package.json'), values: packageJson(name, versions, inMonorepo) },
    { action: 'create', path: at('tsconfig.json'), content: TSCONFIG_JSON, kept: TSCONFIG_KEPT },
    ...Object.entries(created).map(([path, content]): FileChange => ({ action: 'create', path: at(path), content })),
    { action: 'create', path: at('src/index.ts'), content: SRC_INDEX_TS, kept: INDEX_KEPT },
    { action: 'complete-env', path: at('.env'), variables: variables(false) },
    { action: 'complete-env', path: at('.env.example'), variables: variables(true) },
    { action: 'complete-env', path: at('.env.test'), variables: STORE_FILES[stores.files].testEnv },
    { action: 'ensure-lines', path: at('.gitignore'), lines: GITIGNORE },
    { action: 'ensure-lines', path: at('CLAUDE.md'), lines: CLAUDE_MD },
    { action: 'remove-unchanged', path: at('index.ts'), content: BUN_INIT_INDEX_TS, why: 'the backend starts at src/index.ts' },
    { action: 'remove-json-key', path: at('package.json'), key: 'module', value: 'index.ts', whenMissing: at('index.ts') },
  ]
}
