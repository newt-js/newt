import { afterEach }      from 'bun:test'
import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
// --------------------------------------------------------
import { MemoryCluster }  from '../../../adapters/cluster/memory/memory-cluster/memory-cluster'
import { MemoryDatabase } from '../../../adapters/database/memory/memory-database/memory-database'
import { DomainEvent }    from '../../../domain/events/event/domain-event'
import { log }            from '../../platform/log/log'
import { unscopedLogs }   from '../../platform/unscoped-logs/unscoped-logs'
import { TestContext }    from './test-context'
import { testContext }    from './test-context'

const created: DomainEvent = { name: 'user.created', payload: { id: 'u1' }, occurredAt: '' }

let shop: TestContext

afterEach(() => shop.close())

describe('testContext', () => {
  test('a context of the adapters it is given, on a clock that stands still', () => {
    const database = new MemoryDatabase()
    shop = testContext({ name: 'shop', database, cluster: new MemoryCluster(), at: '2026-03-01T09:00:00.000Z' })

    expect([shop.base.name, shop.base.database]).toEqual(['shop', database])
    expect(shop.base.clock).toBe(shop.clock)
    expect(shop.clock.now().toISOString()).toBe('2026-03-01T09:00:00.000Z')
  })

  test('settle runs every job its events left, and what they publish in turn', async () => {
    shop = testContext({ name: 'shop', database: new MemoryDatabase(), cluster: new MemoryCluster() })
    const ran: string[] = []
    shop.base.bus.subscribe('user.created', async () => {
      ran.push('welcome')
      await shop.base.bus.publish({ name: 'mail.sent', payload: {}, occurredAt: '' } as DomainEvent)
    }, { strategy: 'handler', queue: 'mail.sendWelcome.on.user.created' })
    shop.base.bus.subscribe('mail.sent', () => void ran.push('counted'), { strategy: 'handler', queue: 'stats.count.on.mail.sent' })

    await shop.base.bus.publish(created)
    await shop.settle()

    expect(ran).toEqual(['welcome', 'counted'])
  })

  test('keeps its logs to itself, for the test to read', async () => {
    const outside: string[] = []
    const before = unscopedLogs.logger
    unscopedLogs.useLogger({ write: line => void outside.push(line.message) })
    try {
      shop = testContext({ name: 'shop', database: new MemoryDatabase(), cluster: new MemoryCluster() })
      shop.base.bus.subscribe('user.created', () => log.info('as a job'), { strategy: 'handler', queue: 'mail.sendWelcome.on.user.created' })

      await shop.base.bus.publish(created)
      await shop.settle()

      expect(shop.logs.said('info')).toContain('as a job')
      expect(outside).toEqual([])
    } finally {
      unscopedLogs.useLogger(before)
    }
  })

  test('close stops its worker and its schedules, then closes its database', async () => {
    const database = new MemoryDatabase()
    const order: string[] = []
    const closeDatabase = database.close.bind(database)
    database.close = async () => {
      order.push('database closed')
      await closeDatabase()
    }
    const own = testContext({ name: 'shop', database, cluster: new MemoryCluster() })
    const { worker, schedules } = own.base
    const stopWorker = worker.stop.bind(worker)
    worker.stop = async (...args) => {
      await stopWorker(...args)
      order.push('worker stopped')
    }
    const stopSchedules = schedules.stop.bind(schedules)
    schedules.stop = async () => {
      await stopSchedules()
      order.push('schedules stopped')
    }
    shop = testContext({ name: 'other', database: new MemoryDatabase(), cluster: new MemoryCluster() })
    schedules.define('report.daily', '* * * * *')
    worker.start()
    schedules.start()

    await own.close()

    expect([order.slice(0, 2).sort(), order[2]]).toEqual([['schedules stopped', 'worker stopped'], 'database closed'])
  })
})
