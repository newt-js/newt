import { mkdirSync }        from 'node:fs'
import { mkdtempSync }      from 'node:fs'
import { realpathSync }     from 'node:fs'
import { writeFileSync }    from 'node:fs'
import { tmpdir }           from 'node:os'
import { dirname }          from 'node:path'
import { join }             from 'node:path'
// --------------------------------------------------------
import { asRule }           from '../../testing/testing'
import { tester }           from '../../testing/testing'
import { publishedModules } from './published-modules'

/** A context panel that publishes workspace and keeps workspaceInvite, and backoffice, which uses it. */
const CONTEXTS = join(realpathSync(mkdtempSync(join(tmpdir(), 'newt-lint-published-'))), 'src/contexts')
const PANEL = [
  'export class Panel_Context extends BoundedContext {',
  '  public readonly workspace: Workspace_Module',
  '  private readonly secret: Secret_Module',
  '  static initialize() {}',
  '}',
].join('\n')
const FILES: Record<string, string> = {
  'panel/panel.context.ts': PANEL,
  'panel/modules/workspace/workspace.module.ts': '',
  'panel/modules/workspace-invite/workspace-invite.module.ts': '',
  'backoffice/backoffice.context.ts': '',
}
for (const [file, code] of Object.entries(FILES)) {
  mkdirSync(dirname(join(CONTEXTS, file)), { recursive: true })
  writeFileSync(join(CONTEXTS, file), code)
}

const ACCOUNT = `${CONTEXTS}/backoffice/modules/account`
const PANEL_MODULES = '../../../panel/modules'
const options = [{ folder: CONTEXTS }]

tester.run('published-modules', asRule(publishedModules), {
  valid: [
    // Another context's class, which is given to the module as a whole.
    { code: "import type { Panel_Context } from '../../../panel/panel.context'", filename: `${ACCOUNT}/account.deps.ts`, options },
    { code: "import { Panel_Context } from '../panel/panel.context'", filename: `${CONTEXTS}/backoffice/backoffice.context.ts`, options },
    // Of a module it publishes, the types of its module, schema and events, and its errors.
    { code: `import type { WorkspaceDTO, Workspace_Module } from '${PANEL_MODULES}/workspace'`, filename: `${ACCOUNT}/account.module.ts`, options },
    { code: `import { WorkspaceNotFound } from '${PANEL_MODULES}/workspace/index'`, filename: `${ACCOUNT}/account.module.ts`, options },
    // Its own context's modules, which newt/module-imports judges.
    { code: "import type { Plan_Module } from '../plan'", filename: `${ACCOUNT}/account.deps.ts`, options },
    // Outside the contexts.
    { code: `import { x } from '${CONTEXTS}/panel/modules/workspace/workspace.repository'`, filename: '/elsewhere/file.ts', options },
  ],
  invalid: [
    // A module the other context does not publish.
    {
      code: `import type { WorkspaceInvite_Module } from '${PANEL_MODULES}/workspace-invite'`,
      filename: `${ACCOUNT}/account.deps.ts`,
      options,
      errors: [{ messageId: 'unpublished', data: { path: `${PANEL_MODULES}/workspace-invite`, context: 'panel', module: 'workspaceInvite', folder: 'workspace-invite' } }],
    },
    // Its private fields publish nothing.
    { code: `import type { Secret_Module } from '${PANEL_MODULES}/secret'`, filename: `${ACCOUNT}/account.deps.ts`, options, errors: [{ messageId: 'unpublished' }] },
    // What a published module keeps to itself.
    { code: `import { Workspace_Repository } from '${PANEL_MODULES}/workspace/workspace.repository'`, filename: `${ACCOUNT}/account.module.ts`, options, errors: [{ messageId: 'inside' }] },
    // Any other file of the context.
    { code: "import { authenticate } from '../../../panel/auth'", filename: `${ACCOUNT}/account.module.ts`, options, errors: [{ messageId: 'inside' }] },
    // Its types as values.
    { code: `import type { WorkspaceDTO } from '${PANEL_MODULES}/workspace/workspace.schema'`, filename: `${ACCOUNT}/account.module.ts`, options, errors: [{ messageId: 'inside' }] },
    { code: `import { WorkspaceNotFound } from '${PANEL_MODULES}/workspace/errors/workspace-not-found'`, filename: `${ACCOUNT}/account.module.ts`, options, errors: [{ messageId: 'inside' }] },
  ],
})
