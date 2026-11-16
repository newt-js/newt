import { join }                  from 'node:path'
// --------------------------------------------------------
import type { FileChange }       from '../../../commands/command'
import type { TemplateVersions } from '../../template-versions/template-versions'
import { AGENTS_MD }             from '../files/agents-md'
import { CLAUDE_MD }             from '../files/claude-md'
import { env }                   from '../files/env'
import { ESLINT_CONFIG_TS }      from '../files/eslint-config-ts'
import { GITIGNORE }             from '../files/gitignore'
import { packageJson }           from '../files/package-json'
import { SRC_BACKEND_TEST_TS }   from '../files/src-backend-test-ts'
import { SRC_BACKEND_TS }        from '../files/src-backend-ts'
import { SRC_CONTEXTS_TS }       from '../files/src-contexts-ts'
import { SRC_INDEX_TS }          from '../files/src-index-ts'
import { TSCONFIG_JSON }         from '../files/tsconfig-json'

export type BackendTemplateOptions = { folder: string, name: string, port: number, versions: TemplateVersions }

export function backendTemplate({ folder, name, port, versions }: BackendTemplateOptions): FileChange[] {
  const files: Record<string, string> = {
    'package.json': packageJson(name, versions),
    'tsconfig.json': TSCONFIG_JSON,
    'eslint.config.ts': ESLINT_CONFIG_TS,
    '.gitignore': GITIGNORE,
    '.env': env(port),
    '.env.example': env(port),
    'AGENTS.md': AGENTS_MD,
    'CLAUDE.md': CLAUDE_MD,
    'src/index.ts': SRC_INDEX_TS,
    'src/backend.ts': SRC_BACKEND_TS,
    'src/backend.test.ts': SRC_BACKEND_TEST_TS,
    'src/contexts.ts': SRC_CONTEXTS_TS,
  }
  return Object.entries(files).map(([path, content]) => ({ action: 'create', path: join(folder, path), content }))
}
