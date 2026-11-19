import { expect }           from 'bun:test'
import { test }             from 'bun:test'
import { mkdtempSync }      from 'node:fs'
import { tmpdir }           from 'node:os'
import { join }             from 'node:path'
// --------------------------------------------------------
import { featureDepsGraph } from './feature-deps-graph'

test('what each feature of a context uses, by the feature classes its class names, whatever their keys, never itself', async () => {
  const context = mkdtempSync(join(tmpdir(), 'newt-cli-graph-'))
  await Bun.write(join(context, 'features/campaigns/campaigns.feature.ts'), 'export type Campaigns_Uses = {\n  people: Contacts_Feature;\n}\n\nexport class Campaigns_Feature extends Feature {\n  static initialize(base, router, uses: Campaigns_Uses): Campaigns_Feature {}\n}\n')
  await Bun.write(join(context, 'features/contacts/contacts.feature.ts'), 'export type Contacts_Uses = { list: MailingLists_Feature }\n')
  expect(await featureDepsGraph(context, ['campaigns', 'contacts', 'mailing-lists'])).toEqual(new Map([['campaigns', ['contacts']], ['contacts', ['mailingLists']], ['mailingLists', []]]))
})
