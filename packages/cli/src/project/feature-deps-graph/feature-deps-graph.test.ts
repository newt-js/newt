import { expect }           from 'bun:test'
import { test }             from 'bun:test'
import { mkdtempSync }      from 'node:fs'
import { tmpdir }           from 'node:os'
import { join }             from 'node:path'
// --------------------------------------------------------
import { featureDepsGraph } from './feature-deps-graph'

test('what each feature of a context uses, by the types its entry point names, whatever their keys', async () => {
  const context = mkdtempSync(join(tmpdir(), 'newt-cli-graph-'))
  await Bun.write(join(context, 'features/campaigns/campaigns.feature.ts'), 'export type CampaignsUses = {\n  people: ContactsFeature;\n}\n\nexport type CampaignsFeature = ReturnType<typeof campaignsFeature>\n')
  await Bun.write(join(context, 'features/contacts/contacts.feature.ts'), 'export type ContactsUses = { list: MailingListsFeature }\n')
  expect(await featureDepsGraph(context, ['campaigns', 'contacts', 'mailing-lists'])).toEqual(new Map([['campaigns', ['contacts']], ['contacts', ['mailingLists']], ['mailingLists', []]]))
})
