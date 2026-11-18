import { expect }           from 'bun:test'
import { test }             from 'bun:test'
// --------------------------------------------------------
import { runCommand }       from '../run/run-command/run-command'
import { moduleProject }    from '../testing/module-project/module-project'
import { ADD_ERROR }        from './add-error/add-error'
import { ADD_EVENT }        from './add-event/add-event'
import { ADD_SERVICE }      from './add-service/add-service'
import { ADD_SUBSCRIPTION } from './add-subscription/add-subscription'
import { ADD_USE_CASE }     from './add-use-case/add-use-case'
import { ADD_VALUE_OBJECT } from './add-value-object/add-value-object'
import type { Command }     from './command'

const AGAIN: [Command, string[]][] = [
  [ADD_EVENT, ['sales/orders/order', 'shipped']],
  [ADD_ERROR, ['sales/orders/order', 'not-paid', '--kind', 'conflict']],
  [ADD_SERVICE, ['sales/orders/order', 'exchange-rates']],
  [ADD_VALUE_OBJECT, ['sales/orders/order', 'postal-code']],
  [ADD_USE_CASE, ['sales/orders/order', 'mark-paid']],
  [ADD_SUBSCRIPTION, ['sales/orders/order', 'mark-paid', '--on', 'created']],
]

test('each command run again changes nothing, and says so', async () => {
  const backend = await moduleProject()
  for (const [command, args] of AGAIN) {
    expect((await runCommand(command, args, { cwd: backend, ask: null })).code).toBe(0)
    const again = await runCommand(command, [...args, '--json'], { cwd: backend, ask: null })
    expect(again.code).toBe(0)
    expect((JSON.parse(again.text) as { files: { path: string, status: string }[] }).files.filter(file => file.status !== 'skipped')).toEqual([])
  }
})
