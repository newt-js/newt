import { asRule }         from '../../testing/testing'
import { tester }         from '../../testing/testing'
import { featureImports } from './feature-imports'

const CAMPAIGNS = '/repo/src/contexts/engagement/features/campaigns'
const options = [{ folder: '/repo/src/contexts' }]

tester.run('feature-imports', asRule(featureImports), {
  valid: [
    // Inside its own feature, anything of it.
    { code: "import type { Tag_Module } from '../tag/tag.module'", filename: `${CAMPAIGNS}/modules/template/template.deps.ts`, options },
    { code: "import { Template_Module } from './modules/template/template.module'", filename: `${CAMPAIGNS}/campaigns.feature.ts`, options },
    // Another feature, through its entry point.
    { code: "import type { ContactsFeature } from '../contacts/contacts.feature'", filename: `${CAMPAIGNS}/campaigns.feature.ts`, options },
    { code: "import type { ContactDTO } from '../../../contacts/contacts.feature'", filename: `${CAMPAIGNS}/modules/campaign/campaign.module.ts`, options },
    { code: "import { contactsFeature } from './features/contacts/contacts.feature.ts'", filename: '/repo/src/contexts/engagement/engagement-features.ts', options },
    // Outside the contexts, and a package.
    { code: "import { x } from './features/a/modules/b/b.module'", filename: '/repo/src/other/file.ts', options },
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
    // The context's composition imports a feature's entry point, not its modules.
    { code: "import { Contact_Module } from './features/contacts/modules/contact/contact.module'", filename: '/repo/src/contexts/engagement/engagement-features.ts', options, errors: [{ messageId: 'inside' }] },
  ],
})
