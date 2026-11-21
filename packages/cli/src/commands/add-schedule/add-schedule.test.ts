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
    expect(module).toContain("this.purgeExpiredSchedule = base.schedules.define(\n      'order.purgeExpired',\n      '0 3 * * *',\n    )")
    expect(module).toContain('  async purgeExpired(): Promise<void> {')
    expect(await read(backend, 'order.workers.ts')).toContain("  orders.on(orders.purgeExpiredSchedule, 'purgeExpired')")
    expect(await read(backend, 'order.module.test.ts')).toContain("schedule: { cron: '0 3 * * *' }")
    expect(await checkGenerated(backend)).toEqual([])
  }, 30_000)

  test('its test fails when the schedule is not registered, or its use case throws', async () => {
    const backend = await moduleProject()
    await run(ADD_SCHEDULE, ['sales/order', 'purge-expired', '--cron', '0 3 * * *'], backend)
    const workers = join(backend, ORDER_MODULE, 'order.workers.ts')
    const registered = await Bun.file(workers).text()
    await Bun.write(workers, registered.replace("  orders.on(orders.purgeExpiredSchedule, 'purgeExpired')\n", ''))
    expect((await checkGenerated(backend, { lint: false })).join('')).toContain('purgeExpired runs at 0 3 * * *')
    await Bun.write(workers, registered)
    const module = join(backend, ORDER_MODULE, 'order.module.ts')
    await Bun.write(module, (await Bun.file(module).text()).replace('  async purgeExpired(): Promise<void> {\n', "  async purgeExpired(): Promise<void> {\n    throw new Error('broken')\n"))
    expect((await checkGenerated(backend, { lint: false })).join('')).toContain('purgeExpired runs at 0 3 * * *')
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

  test("refuses the names a module keeps, and a member of the module that is not a use case", async () => {
    const backend = await moduleProject()
    expect((await run(ADD_SCHEDULE, ['sales/order', 'on', '--cron', '0 3 * * *'], backend)).text).toStartWith("'on' cannot name a use case")
    expect((await run(ADD_SCHEDULE, ['sales/order', 'repository', '--cron', '0 3 * * *'], backend)).text).toBe('Order_Module has repository already, and it is not a use case: name the use case by what it does')
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
