import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
import { join }           from 'node:path'
// --------------------------------------------------------
import { runCommand }     from '../../run/run-command/run-command'
import { checkGenerated } from '../../testing/check-generated/check-generated'
import { ORDER_MODULE }   from '../../testing/module-project/module-project'
import { moduleProject }  from '../../testing/module-project/module-project'
import { ADD_USE_CASE }   from '../add-use-case/add-use-case'
import type { Command }   from '../command'
import { ADD_SCHEDULE }   from './add-schedule'

const run = (command: Command, args: string[], cwd: string) => runCommand(command, args, { cwd, ask: null })

const read = (backend: string, file: string) => Bun.file(join(backend, ORDER_MODULE, file)).text()

describe('newt add schedule', () => {
  test('a use case on a cron, which the description of the app tells, and whose lint, types and tests pass', async () => {
    const backend = await moduleProject()
    expect((await run(ADD_SCHEDULE, ['sales/order', 'purge-expired', '--cron', '0 3 * * *'], backend)).code).toBe(0)
    const module = await read(backend, 'order.module.ts')
    expect(module).toContain("this.purgeExpiredSchedule = base.schedules.define('order.purgeExpired', '0 3 * * *')")
    expect(module).toContain('  async purgeExpired(): Promise<void> {')
    expect(await read(backend, 'order.workers.ts')).toContain("  orders.on(orders.purgeExpiredSchedule, 'purgeExpired')")
    expect(await read(backend, 'order.module.test.ts')).toContain("schedule: { cron: '0 3 * * *' }")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('run again, it changes nothing', async () => {
    const backend = await moduleProject()
    await run(ADD_SCHEDULE, ['sales/order', 'purge-expired', '--cron', '0 3 * * *'], backend)
    const again = JSON.parse((await run(ADD_SCHEDULE, ['sales/order', 'purge-expired', '--cron', '0 3 * * *', '--json'], backend)).text) as { files: { status: string }[] }
    expect(again.files.filter(file => file.status !== 'skipped')).toEqual([])
  })

  test('refuses a use case that takes an input, and a cron that is not one', async () => {
    const backend = await moduleProject()
    await run(ADD_USE_CASE, ['sales/order', 'mark-paid'], backend)
    expect((await run(ADD_SCHEDULE, ['sales/order', 'mark-paid', '--cron', '0 3 * * *'], backend)).text).toBe('markPaid takes an input, and a schedule gives none: name a use case of its own')
    expect((await run(ADD_SCHEDULE, ['sales/order', 'purge', '--cron', 'daily'], backend)).text).toStartWith("'daily' is not a cron")
  })

  test('refuses a second cron for a use case on one already, and writes nothing', async () => {
    const backend = await moduleProject()
    await run(ADD_SCHEDULE, ['sales/order', 'purge-expired', '--cron', '0 3 * * *'], backend)
    const module = await read(backend, 'order.module.ts')
    const output = await run(ADD_SCHEDULE, ['sales/order', 'purge-expired', '--cron', '0 4 * * *'], backend)
    expect(output).toMatchObject({ code: 1, text: "purgeExpired runs at '0 3 * * *' already: change that cron in order.module.ts, or schedule a use case of its own" })
    expect(await read(backend, 'order.module.ts')).toBe(module)
  })
})
