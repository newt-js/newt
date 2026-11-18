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

/** A context engagement whose campaigns use contacts, and a context loop whose features a and b use each other. */
const CONTEXTS = join(realpathSync(mkdtempSync(join(tmpdir(), 'newt-lint-features-'))), 'src/contexts')
const FILES: Record<string, string> = {
  'engagement/features/campaigns/campaigns.feature.ts': "import type { ContactsFeature } from '../contacts/contacts.feature'\n",
  'engagement/features/contacts/contacts.feature.ts': '',
  'engagement/features/reports/reports.feature.ts': '',
  'loop/features/a/a.feature.ts': "import type { B } from '../b/b.feature'\n",
  'loop/features/b/b.feature.ts': "import type { A } from '../a/a.feature'\n",
  'ring/features/a/a.feature.ts': "import type { B } from '../b/b.feature'\n",
  'ring/features/b/b.feature.ts': "import type { C } from '../c/c.feature'\n",
  'ring/features/c/c.feature.ts': "import type { A } from '../a/a.feature'\n",
}
for (const [file, code] of Object.entries(FILES)) {
  mkdirSync(dirname(join(CONTEXTS, file)), { recursive: true })
  writeFileSync(join(CONTEXTS, file), code)
}

const CAMPAIGNS = `${CONTEXTS}/engagement/features/campaigns`
const options = [{ folder: CONTEXTS }]

tester.run('feature-imports', asRule(featureImports), {
  valid: [
    // Inside its own feature, anything of it.
    { code: "import type { Tag_Module } from '../tag/tag.module'", filename: `${CAMPAIGNS}/modules/template/template.deps.ts`, options },
    { code: "import { Template_Module } from './modules/template/template.module'", filename: `${CAMPAIGNS}/campaigns.feature.ts`, options },
    // Another feature it uses, through its entry point.
    { code: "import type { ContactsFeature } from '../contacts/contacts.feature'", filename: `${CAMPAIGNS}/campaigns.feature.ts`, options },
    { code: "import type { ContactDTO } from '../../../contacts/contacts.feature'", filename: `${CAMPAIGNS}/modules/campaign/campaign.module.ts`, options },
    // The context's composition imports every feature's entry point.
    { code: "import { contactsFeature } from './features/contacts/contacts.feature.ts'", filename: `${CONTEXTS}/engagement/engagement-features.ts`, options },
    // An entry point's own import is what it uses, even one it is not read with, as through an alias.
    { code: `import type { ReportsFeature } from '${CONTEXTS}/engagement/features/reports/reports.feature'`, filename: `${CAMPAIGNS}/campaigns.feature.ts`, options },
    // Outside the contexts, and a package.
    { code: "import { x } from './features/a/modules/b/b.module'", filename: '/elsewhere/file.ts', options },
    { code: "import { z } from 'zod'", filename: `${CAMPAIGNS}/campaigns.feature.ts`, options },
  ],
  invalid: [
    {
      code: "import { Contact_Module } from '../../../contacts/modules/contact/contact.module'",
      filename: `${CAMPAIGNS}/modules/campaign/campaign.deps.ts`,
      options,
      errors: [{ messageId: 'inside', data: { path: '../../../contacts/modules/contact/contact.module', feature: 'contacts' } }],
    },
    { code: "import type { ContactDTO } from '../../../contacts/modules/contact/contact.schema'", filename: `${CAMPAIGNS}/modules/campaign/campaign.module.ts`, options, errors: [{ messageId: 'inside' }] },
    { code: "export * from '../contacts/index'", filename: `${CAMPAIGNS}/campaigns.feature.ts`, options, errors: [{ messageId: 'inside' }] },
    { code: "import { Contact_Module } from './features/contacts/modules/contact/contact.module'", filename: `${CONTEXTS}/engagement/engagement-features.ts`, options, errors: [{ messageId: 'inside' }] },
    // A feature its entry point does not import: it is not given it.
    {
      code: "import type { ReportsFeature } from '../../../reports/reports.feature'",
      filename: `${CAMPAIGNS}/modules/campaign/campaign.module.ts`,
      options,
      errors: [{ messageId: 'undeclared', data: { path: '../../../reports/reports.feature', feature: 'reports', own: 'campaigns', uses: 'contacts' } }],
    },
    { code: "import type { CampaignsFeature } from '../../../campaigns/campaigns.feature'", filename: `${CONTEXTS}/engagement/features/contacts/modules/contact/contact.module.ts`, options, errors: [{ messageId: 'undeclared', data: { path: '../../../campaigns/campaigns.feature', feature: 'campaigns', own: 'contacts', uses: 'no other feature' } }] },
    // Two features whose entry points import each other.
    { code: "import type { B } from '../b/b.feature'", filename: `${CONTEXTS}/loop/features/a/a.feature.ts`, options, errors: [{ messageId: 'cycle', data: { cycle: 'a → b → a' } }] },
    { code: "import type { B } from '../b/b.feature'", filename: `${CONTEXTS}/ring/features/a/a.feature.ts`, options, errors: [{ messageId: 'cycle', data: { cycle: 'a → b → c → a' } }] },
  ],
})
