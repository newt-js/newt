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
import { agentsMd }              from '../files/agents-md'
import { CLAUDE_MD }             from '../files/claude-md'
import { ENV_TS }                from '../files/env-ts'
import { ESLINT_CONFIG_TS }      from '../files/eslint-config-ts'
import { GITIGNORE }             from '../files/gitignore'
import { packageJson }           from '../files/package-json'
import { AUTH_KEPT }             from '../files/src-auth-ts'
import { SRC_AUTH_TS }           from '../files/src-auth-ts'
import { SRC_CONTEXTS_TS }       from '../files/src-contexts-ts'
import { SRC_INDEX_TEST_TS }     from '../files/src-index-test-ts'
import { srcIndexTs }            from '../files/src-index-ts'
import { srcTestDatabaseTs }     from '../files/src-test-database-ts'
import { TSCONFIG_JSON }         from '../files/tsconfig-json'

const TSCONFIG_KEPT = { needs: ['"bun"', '"preserve"', '"bundler"'], warning: 'newt\'s code needs in its compilerOptions types: ["bun"], module: "Preserve" and moduleResolution: "bundler"' }

const INDEX_KEPT = { needs: ['startBackend', 'import.meta.main'], warning: 'it should export startBackend, which its tests start, and start the backend when run: if (import.meta.main) await startBackend(Number(Bun.env.PORT || 3000))' }

export type BackendTemplateOptions = { folder: string, name: string, port: number, stores: Stores, versions: TemplateVersions, inMonorepo?: boolean }

export function backendTemplate({ folder, name, port, stores, versions, inMonorepo = false }: BackendTemplateOptions): FileChange[] {
  const at = (path: string) => join(folder, path)
  const variables = (example: boolean) => ({ PORT: String(port), ...CLUSTERS[stores.cluster].env, ...STORE_FILES[stores.files].env(port, example) })
  const created: Record<string, string> = {
    'eslint.config.ts': ESLINT_CONFIG_TS,
    'AGENTS.md': agentsMd(stores.database),
    'src/stores.ts': storesTs(stores),
    ...storesNeedEnv(stores) ? { 'src/env.ts': ENV_TS } : {},
    'src/index.test.ts': SRC_INDEX_TEST_TS,
    'src/contexts/contexts.ts': SRC_CONTEXTS_TS,
  }
  const testDatabase = srcTestDatabaseTs(stores.database)
  if (testDatabase) created['src/test-database.ts'] = testDatabase
  return [
    { action: 'complete-json', path: at('package.json'), values: packageJson(name, versions, inMonorepo) },
    { action: 'create', path: at('tsconfig.json'), content: TSCONFIG_JSON, kept: TSCONFIG_KEPT },
    ...Object.entries(created).map(([path, content]): FileChange => ({ action: 'create', path: at(path), content })),
    { action: 'create', path: at('src/index.ts'), content: srcIndexTs(CLUSTERS[stores.cluster]), kept: INDEX_KEPT },
    { action: 'create', path: at('src/auth.ts'), content: SRC_AUTH_TS, kept: AUTH_KEPT },
    { action: 'complete-env', path: at('.env'), variables: variables(false) },
    { action: 'complete-env', path: at('.env.example'), variables: variables(true) },
    { action: 'ensure-lines', path: at('.gitignore'), lines: GITIGNORE },
    { action: 'ensure-lines', path: at('CLAUDE.md'), lines: CLAUDE_MD },
    { action: 'remove-unchanged', path: at('index.ts'), content: BUN_INIT_INDEX_TS, why: 'the backend starts at src/index.ts' },
    { action: 'remove-json-key', path: at('package.json'), key: 'module', value: 'index.ts', whenMissing: at('index.ts') },
  ]
}
