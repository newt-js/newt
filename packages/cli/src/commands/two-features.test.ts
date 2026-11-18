import { expect }           from 'bun:test'
import { test }             from 'bun:test'
import { join }             from 'node:path'
// --------------------------------------------------------
import { runCommand }       from '../run/run-command/run-command'
import { checkGenerated }   from '../testing/check-generated/check-generated'
import { generate }         from '../testing/generate/generate'
import { ADD_CONTEXT }      from './add-context/add-context'
import { ADD_DEPS }         from './add-deps/add-deps'
import { ADD_EVENT }        from './add-event/add-event'
import { ADD_MODULE }       from './add-module/add-module'
import { ADD_ROUTE }        from './add-route/add-route'
import { ADD_SCHEDULE }     from './add-schedule/add-schedule'
import { ADD_SUBSCRIPTION } from './add-subscription/add-subscription'
import { ADD_USE_CASE }     from './add-use-case/add-use-case'
import { ADD_VALUE_OBJECT } from './add-value-object/add-value-object'
import type { Command }     from './command'
import { INIT }             from './init/init'

const ENGAGEMENT = 'src/contexts/engagement'
const CAMPAIGN = `${ENGAGEMENT}/features/campaigns/modules/campaign`
const CONTACT = `${ENGAGEMENT}/features/contacts/modules/contact`

/** Replaces `from` by `to` in a file of the backend, as a person would by hand: the edit must be there. */
async function edit(backend: string, file: string, from: string | RegExp, to: string): Promise<void> {
  const path = join(backend, file)
  const text = await Bun.file(path).text()
  const edited = text.replace(from, to)
  expect(edited).not.toBe(text)
  await Bun.write(path, edited)
}

test('a context with two features, campaigns using contacts and reacting to them, made with the CLI, whose lint, types and tests pass', async () => {
  const backend = join(await generate(INIT, ['shop']), 'shop')
  const run = async (command: Command, ...args: string[]) => {
    const output = await runCommand(command, args, { cwd: backend, ask: null })
    expect(output.code, output.text).toBe(0)
    return output.text
  }

  await run(ADD_CONTEXT, 'engagement')
  for (const module of ['contacts/contact', 'contacts/tag', 'campaigns/campaign', 'campaigns/template', 'campaigns/tag']) {
    await run(ADD_MODULE, `engagement/${module}`)
  }
  await run(ADD_DEPS, 'engagement/campaigns/campaign', 'template')
  await run(ADD_DEPS, 'engagement/campaigns/campaign', 'contacts')
  await run(ADD_DEPS, 'engagement/contacts/contact', 'tag')

  // contacts shows campaigns how to read a contact, and that one was created.
  await edit(backend, `${CONTACT}/contact.module.ts`, 'exposes = { useCases: [], events: [] } as const', "exposes = { useCases: ['get'], events: ['created'] } as const")

  // A campaign keeps the contact it was sent to, by an id of its own of contacts' brand.
  await run(ADD_VALUE_OBJECT, 'engagement/campaigns/campaign', 'contact-id')
  await run(ADD_USE_CASE, 'engagement/campaigns/campaign', 'launch')
  await run(ADD_ROUTE, 'engagement/campaigns/campaign', 'launch')
  await run(ADD_EVENT, 'engagement/campaigns/campaign', 'launched')

  // On every contact created, campaign counts its audience again.
  await run(ADD_SCHEDULE, 'engagement/campaigns/campaign', 'count-audience', '--cron', '0 4 * * *')
  const subscribed = await run(ADD_SUBSCRIPTION, 'engagement/campaigns/campaign', 'count-audience', '--on', 'contacts/contact/created')
  expect(subscribed).not.toContain('exposes no created')

  // count-audience reads a contact through what contacts exposes.
  await edit(backend, `${CAMPAIGN}/campaign.module.ts`, /async countAudience\(\): Promise<void> \{\n {2}\}/, [
    'async countAudience(): Promise<void> {',
    "    await this.deps.contacts.contact.get({ id: ContactId.from('0192f0c4-7b1c-7cc0-8000-000000000000') }).catch(() => null)",
    '  }',
  ].join('\n'))
  await edit(backend, `${CAMPAIGN}/campaign.module.ts`, "import { Campaign } from './campaign'\n", "import { Campaign } from './campaign'\nimport { ContactId } from './value-objects/contact-id'\n")

  const features = await Bun.file(join(backend, ENGAGEMENT, 'engagement-features.ts')).text()
  expect(features.indexOf('const contacts =')).toBeLessThan(features.indexOf('const campaigns ='))
  expect(features).toContain('campaignsFeature(base, router, { contacts })')
  expect(await Bun.file(join(backend, CAMPAIGN, 'campaign.workers.ts')).text()).toContain("campaigns.on(deps.contacts.contact.events.created, 'countAudience')")
  expect(await Bun.file(join(backend, CAMPAIGN, 'campaign.module.test.ts')).text()).toContain("each.queue === 'campaigns[campaign].countAudience_on_contacts[contact].created')?.status).toBe('done')")
  expect(await checkGenerated(backend)).toEqual([])
}, 60_000)
