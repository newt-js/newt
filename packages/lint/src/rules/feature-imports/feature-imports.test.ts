import { mkdirSync }      from 'node:fs'
import { mkdtempSync }    from 'node:fs'
import { realpathSync }   from 'node:fs'
import { writeFileSync }  from 'node:fs'
import { tmpdir }         from 'node:os'
import { dirname }        from 'node:path'
import { join }           from 'node:path'
// --------------------------------------------------------
import { asRule }         from '../../testing/testing'
import { tester }         from '../../testing/testing'
import { featureImports } from './feature-imports'

/** A context engagement whose campaigns use contacts, a context loop whose features a and b use each other, and backoffice's accounts using auth's users. */
const CONTEXTS = join(realpathSync(mkdtempSync(join(tmpdir(), 'newt-lint-features-'))), 'src/contexts')
const FILES: Record<string, string> = {
  'engagement/features/campaigns/campaigns.feature.ts': "import type { Contacts_Feature } from '../contacts'\n",
  'engagement/features/contacts/contacts.feature.ts': '',
  'engagement/features/reports/reports.feature.ts': '',
  'engagement/features/users/users.feature.ts': '',
  'auth/features/users/users.feature.ts': '',
  'auth/features/roles/roles.feature.ts': '',
  'backoffice/features/accounts/accounts.feature.ts': "import type { Users_Feature } from '../../../auth/features/users'\n",
  'loop/features/a/a.feature.ts': "import type { B_Feature } from '../b'\n",
  'loop/features/b/b.feature.ts': "import type { A_Feature } from '../a'\n",
  'ring/features/a/a.feature.ts': "import type { B_Feature } from '../b'\n",
  'ring/features/b/b.feature.ts': "import type { C_Feature } from '../c'\n",
  'ring/features/c/c.feature.ts': "import type { A_Feature } from '../a'\n",
}
for (const [file, code] of Object.entries(FILES)) {
  mkdirSync(dirname(join(CONTEXTS, file)), { recursive: true })
  writeFileSync(join(CONTEXTS, file), code)
}

const CAMPAIGNS = `${CONTEXTS}/engagement/features/campaigns`
const ACCOUNTS = `${CONTEXTS}/backoffice/features/accounts`
const options = [{ folder: CONTEXTS }]

tester.run('feature-imports', asRule(featureImports), {
  valid: [
    // Inside its own feature, anything of it.
    { code: "import type { Tag_Module } from '../tag/tag.module'", filename: `${CAMPAIGNS}/template/template.deps.ts`, options },
    { code: "import { Template_Module } from './template/template.module'", filename: `${CAMPAIGNS}/campaigns.feature.ts`, options },
    { code: "export { Campaigns_Feature } from './campaigns.feature'", filename: `${CAMPAIGNS}/index.ts`, options },
    // Another feature it uses, through its entry point, index.ts: by its folder, or by its name.
    { code: "import type { Contacts_Feature } from '../contacts'", filename: `${CAMPAIGNS}/campaigns.feature.ts`, options },
    { code: "import type { ContactDTO } from '../../contacts/index'", filename: `${CAMPAIGNS}/campaign/campaign.module.ts`, options },
    // The context imports every feature's entry point.
    { code: "import { Contacts_Feature } from './features/contacts'", filename: `${CONTEXTS}/engagement/engagement.context.ts`, options },
    // A feature's own import is what it uses, even one it is not read with, as through an alias.
    { code: `import type { Reports_Feature } from '${CONTEXTS}/engagement/features/reports'`, filename: `${CAMPAIGNS}/campaigns.feature.ts`, options },
    // A feature of another context its class imports, through its entry point.
    { code: "import type { Users_Feature } from '../../../../auth/features/users'", filename: `${ACCOUNTS}/account/account.deps.ts`, options },
    { code: "import type { Roles_Feature } from '../../../auth/features/roles'", filename: `${ACCOUNTS}/accounts.feature.ts`, options },
    // Outside the contexts, and a package.
    { code: "import { x } from './features/a/b/b.module'", filename: '/elsewhere/file.ts', options },
    { code: "import { z } from 'zod'", filename: `${CAMPAIGNS}/campaigns.feature.ts`, options },
  ],
  invalid: [
    // A feature of another context its class does not import, though one of its name in its own context is there.
    {
      code: "import type { Roles_Feature } from '../../../../auth/features/roles'",
      filename: `${ACCOUNTS}/account/account.deps.ts`,
      options,
      errors: [{ messageId: 'undeclaredOther', data: { path: '../../../../auth/features/roles', feature: 'roles', context: 'auth', own: 'accounts', uses: 'auth/users' } }],
    },
    { code: "import type { Users_Feature } from '../../users'", filename: `${CAMPAIGNS}/campaign/campaign.deps.ts`, options, errors: [{ messageId: 'undeclared' }] },
    { code: "import type { User_Module } from '../../../../auth/features/users/user/user.module'", filename: `${ACCOUNTS}/account/account.deps.ts`, options, errors: [{ messageId: 'inside' }] },
    {
      code: "import { Contact_Module } from '../../contacts/contact/contact.module'",
      filename: `${CAMPAIGNS}/campaign/campaign.deps.ts`,
      options,
      errors: [{ messageId: 'inside', data: { path: '../../contacts/contact/contact.module', feature: 'contacts' } }],
    },
    { code: "import type { ContactDTO } from '../../contacts/contact/contact.schema'", filename: `${CAMPAIGNS}/campaign/campaign.module.ts`, options, errors: [{ messageId: 'inside' }] },
    { code: "import { Contact_Module } from './features/contacts/contact/contact.module'", filename: `${CONTEXTS}/engagement/engagement.context.ts`, options, errors: [{ messageId: 'inside' }] },
    // Its class is no entry point: only its index.ts is.
    { code: "import type { Contacts_Feature } from '../../contacts/contacts.feature'", filename: `${CAMPAIGNS}/campaign/campaign.module.ts`, options, errors: [{ messageId: 'inside' }] },
    { code: "import { Contacts_Feature } from './features/contacts/contacts.feature'", filename: `${CONTEXTS}/engagement/engagement.context.ts`, options, errors: [{ messageId: 'inside' }] },
    // A feature its class does not import: it is not given it.
    {
      code: "import type { Reports_Feature } from '../../reports'",
      filename: `${CAMPAIGNS}/campaign/campaign.module.ts`,
      options,
      errors: [{ messageId: 'undeclared', data: { path: '../../reports', feature: 'reports', own: 'campaigns', uses: 'contacts' } }],
    },
    { code: "import type { Campaigns_Feature } from '../../campaigns'", filename: `${CONTEXTS}/engagement/features/contacts/contact/contact.module.ts`, options, errors: [{ messageId: 'undeclared', data: { path: '../../campaigns', feature: 'campaigns', own: 'contacts', uses: 'no other feature' } }] },
    // Two features whose classes import each other.
    { code: "import type { B_Feature } from '../b'", filename: `${CONTEXTS}/loop/features/a/a.feature.ts`, options, errors: [{ messageId: 'cycle', data: { cycle: 'a → b → a' } }] },
    { code: "import type { B_Feature } from '../b'", filename: `${CONTEXTS}/ring/features/a/a.feature.ts`, options, errors: [{ messageId: 'cycle', data: { cycle: 'a → b → c → a' } }] },
  ],
})
