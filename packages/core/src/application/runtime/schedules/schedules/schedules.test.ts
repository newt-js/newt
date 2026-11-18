import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
// --------------------------------------------------------
import { MemoryDatabase }   from '../../../../adapters/database/memory/memory-database/memory-database'
import { systemClock }      from '../../../../domain/clock/system-clock/system-clock'
import { StaleVersion }     from '../../../../domain/errors/stale-version/stale-version'
import type { EventBus }    from '../../../../domain/events/bus/event-bus'
import type { DomainEvent } from '../../../../domain/events/event/domain-event'
import type { NewRow }      from '../../../../domain/repository/records/new-row'
import type { Records }     from '../../../../domain/repository/records/records'
import { UseCaseRunner }    from '../../../../domain/use-case/use-case-runner/use-case-runner'
import { MemoryCluster }    from '../../../cluster/memory-cluster/memory-cluster'
import { Platform }         from '../../../platform/platform/platform'
import { TestClock }        from '../../../testing/test-clock/test-clock'
import type { TickRow }     from '../tick-row'
import { Schedules }        from './schedules'

async function setup() {
  const log: string[] = []
  const failing = new Set<string>()
  const conflicts = { always: false, seen: 0 }
  const database = new MemoryDatabase()
  const ticks = database.records<TickRow>('newt_schedule_tick')
  const table: Records<TickRow> = Object.assign(Object.create(ticks) as Records<TickRow>, {
    insert: async (row: NewRow<TickRow>) => {
      if (conflicts.always) {
        conflicts.seen++
        throw new StaleVersion()
      }
      if (failing.has(row.id)) {
        throw new Error(`${row.id} could not be written`)
      }
      log.push(`insert ${row.id}`)
      await ticks.insert(row)
    },
  })
  const watched = Object.assign(Object.create(database) as MemoryDatabase, { records: () => table })
  const bus: EventBus = { publish: () => {}, subscribe: () => () => {} }
  const schedules = new Schedules(watched, bus, new UseCaseRunner(), new Platform({ cluster: new MemoryCluster() }), systemClock)
  return { schedules, log, failing, conflicts }
}

describe('Schedules.define', () => {
  test('gives an event named after the schedule, to subscribe to', async () => {
    expect((await setup()).schedules.define('report.nightly', '0 3 * * *').name).toBe('report.nightly')
  })

  test('refuses a name not made as an event is, one taken, and a cron expression that is wrong or never due', async () => {
    const { schedules } = await setup()
    schedules.define('report.nightly', '0 3 * * *')

    expect(() => schedules.define('nightly', '0 3 * * *')).toThrow("'<module>.<name>'")
    expect(() => schedules.define('Report.nightly', '0 3 * * *')).toThrow("'<module>.<name>'")
    expect(() => schedules.define('report.nightly', '0 4 * * *')).toThrow('defined already')
    expect(() => schedules.define('report.weekly', '0 3 * *')).toThrow('five fields')
    expect(() => schedules.define('report.never', '0 0 31 2 *')).toThrow('never due')
  })
})

describe('Schedules.start', () => {
  test('looks at once, then waits for the next tick; stopped, it looks no more', async () => {
    const { schedules, log } = await setup()
    schedules.define('report.nightly', '0 3 * * *')

    schedules.start()
    await Bun.sleep(5)
    await schedules.stop()

    expect(log).toEqual(['insert report.nightly'])
  })
})

describe('Schedules.tick', () => {
  test('a schedule that fails keeps none after it from being told, and is tried again at the next tick', async () => {
    const { schedules, log, failing } = await setup()
    schedules.define('report.broken', '0 3 * * *')
    schedules.define('report.nightly', '0 3 * * *')
    failing.add('report.broken')

    await expect(schedules.tick()).rejects.toThrow('report.broken could not be written')
    expect(log).toEqual(['insert report.nightly'])

    failing.clear()
    await schedules.tick()
    expect(log).toEqual(['insert report.nightly', 'insert report.broken'])
  })

  test('says every schedule that failed, all at once', async () => {
    const { schedules, failing } = await setup()
    for (const name of ['report.nightly', 'report.weekly']) {
      schedules.define(name, '0 3 * * *')
      failing.add(name)
    }

    const error = await schedules.tick().catch((error: unknown) => error)

    expect(error).toBeInstanceOf(AggregateError)
    expect((error as AggregateError).errors).toHaveLength(2)
  })

  test('a tick another process wrote at the same time is tried again as any invocation is, no more', async () => {
    const { schedules, conflicts } = await setup()
    schedules.define('report.nightly', '0 3 * * *')
    conflicts.always = true

    await expect(schedules.tick()).rejects.toBeInstanceOf(StaleVersion)
    expect(conflicts.seen).toBe(4)
  })
})

function told(database: MemoryDatabase, clock: TestClock, failing = { publish: false }) {
  const dueAts: string[] = []
  const bus: EventBus = {
    publish: event => {
      if (failing.publish) {
        throw new Error('the bus is down')
      }
      dueAts.push(`${event.name} ${(event as DomainEvent<{ dueAt: string }>).payload.dueAt}`)
    },
    subscribe: () => () => {},
  }
  const schedules = new Schedules(database, bus, new UseCaseRunner(), new Platform({ cluster: new MemoryCluster() }), clock)
  schedules.define('report.minutely', '* * * * *')
  return { schedules, dueAts }
}

describe('Schedules.tick, told on its bus', () => {
  test('its first look only keeps what is due, and tells nothing', async () => {
    const clock = new TestClock('2026-01-01T02:59:30.000Z')
    const { schedules, dueAts } = told(new MemoryDatabase(), clock)

    await schedules.tick()

    expect(dueAts).toEqual([])
  })

  test('once the cron is due again, tells that tick once, with when it was due', async () => {
    const clock = new TestClock('2026-01-01T02:59:30.000Z')
    const { schedules, dueAts } = told(new MemoryDatabase(), clock)
    await schedules.tick()

    clock.advance(60_000)
    await schedules.tick()
    await schedules.tick()

    expect(dueAts).toEqual(['report.minutely 2026-01-01T03:00:00.000Z'])
  })

  test('two instances on one database tell each tick once between them', async () => {
    const clock = new TestClock('2026-01-01T02:59:30.000Z')
    const database = new MemoryDatabase()
    const one = told(database, clock)
    const other = told(database, clock)

    for (let minute = 0; minute < 4; minute++) {
      await Promise.allSettled([one.schedules.tick(), other.schedules.tick()])
      clock.advance(60_000)
    }

    expect([...one.dueAts, ...other.dueAts].sort()).toEqual([
      'report.minutely 2026-01-01T03:00:00.000Z',
      'report.minutely 2026-01-01T03:01:00.000Z',
      'report.minutely 2026-01-01T03:02:00.000Z',
    ])
  })

  test('a tick its bus could not tell is not kept as told: the next look tells it', async () => {
    const clock = new TestClock('2026-01-01T02:59:30.000Z')
    const failing = { publish: false }
    const { schedules, dueAts } = told(new MemoryDatabase(), clock, failing)
    await schedules.tick()
    clock.advance(60_000)

    failing.publish = true
    await expect(schedules.tick()).rejects.toThrow('the bus is down')
    failing.publish = false
    await schedules.tick()

    expect(dueAts).toEqual(['report.minutely 2026-01-01T03:00:00.000Z'])
  })
})
