import { expect }           from 'bun:test'
import { test }             from 'bun:test'
import { join }             from 'node:path'
// --------------------------------------------------------
import { runCommand }       from '../run/run-command/run-command'
import { checkGenerated }   from '../testing/check-generated/check-generated'
import { generate }         from '../testing/generate/generate'
import { ADD_CONTEXT }      from './add-context/add-context'
import { ADD_DEPS }         from './add-deps/add-deps'
import { ADD_MODULE }       from './add-module/add-module'
import { ADD_ROUTE }        from './add-route/add-route'
import { ADD_SCHEDULE }     from './add-schedule/add-schedule'
import { ADD_SUBSCRIPTION } from './add-subscription/add-subscription'
import { ADD_USE_CASE }     from './add-use-case/add-use-case'
import type { Command }     from './command'
import { INIT }             from './init/init'

const ENGAGEMENT = 'src/contexts/engagement'
const CAMPAIGN = `${ENGAGEMENT}/features/campaigns/campaign`

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
  // campaigns' modules first: add deps puts contacts before it, which campaigns uses.
  for (const module of ['campaigns/campaign', 'campaigns/template', 'campaigns/tag', 'contacts/contact', 'contacts/tag']) {
    await run(ADD_MODULE, `engagement/${module}`)
  }
  await run(ADD_DEPS, 'engagement/campaigns/campaign', 'template')
  await run(ADD_DEPS, 'engagement/campaigns/campaign', 'contacts')
  await run(ADD_DEPS, 'engagement/contacts/contact', 'tag')

  await run(ADD_USE_CASE, 'engagement/campaigns/campaign', 'launch')
  await run(ADD_ROUTE, 'engagement/campaigns/campaign', 'launch')

  // Every night, and on every contact created, campaign counts its audience again.
  await run(ADD_SCHEDULE, 'engagement/campaigns/campaign', 'count-audience', '--cron', '0 4 * * *')
  await run(ADD_SUBSCRIPTION, 'engagement/campaigns/campaign', 'count-audience', '--on', 'contacts/contact/created')

  // count-audience lists the contacts, through the module contacts holds.
  await edit(backend, `${CAMPAIGN}/campaign.module.ts`, /async countAudience\(\): Promise<void> \{\n {2}\}/, [
    'async countAudience(): Promise<void> {',
    '    await this.deps.contacts.contact.paginate({}, { size: 1 })',
    '  }',
  ].join('\n'))

  const context = await Bun.file(join(backend, ENGAGEMENT, 'engagement.context.ts')).text()
  expect(context.indexOf('const contacts =')).toBeLessThan(context.indexOf('const campaigns ='))
  expect(context).toContain('Campaigns_Feature.initialize(base, router, {\n      contacts,\n    })')
  expect(await checkGenerated(backend)).toEqual([])
}, 60_000)
