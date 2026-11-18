import { describe }             from 'bun:test'
import { expect }               from 'bun:test'
import { test }                 from 'bun:test'
// --------------------------------------------------------
import { MemoryDatabase }       from '../../../adapters/database/memory/memory-database/memory-database'
import { runAsActor }           from '../../../domain/actor/run-as-actor/run-as-actor'
import { ConcurrencyConflict }  from '../../../domain/errors/concurrency-conflict/concurrency-conflict'
import { StaleVersion }         from '../../../domain/errors/stale-version/stale-version'
import type { DomainEvent }     from '../../../domain/events/event/domain-event'
import type { Observability }   from '../../../domain/observability/observability'
import type { ObservedUseCase } from '../../../domain/observability/observed-use-case'
import type { Cluster }         from '../../cluster/cluster'
import { MemoryCluster }        from '../../cluster/memory-cluster/memory-cluster'
import type { Job }             from '../../database/outbox/job'
import { log }                  from '../../platform/log/log'
import { Platform }             from '../../platform/platform/platform'
import { ContextBase }          from './context-base'

const platform = new Platform({ cluster: new MemoryCluster() })

async function loggedDatabase(log: string[]): Promise<MemoryDatabase> {
  const database = new MemoryDatabase()
  const add = database.outbox.add.bind(database.outbox)
  database.outbox.add = async jobs => {
    log.push(`outbox ${jobs.map(job => job.queue).join(',')}`)
    await add(jobs)
  }
  const close = database.close.bind(database)
  database.close = async () => {
    log.push('database closed')
    await close()
  }
  return database
}

function logged<T>(base: ContextBase, log: string[], fn: () => Promise<T>): Promise<T> {
  return base.database.run(() => {
    log.push('begin')
    base.database.afterCommit(() => log.push('commit'))
    base.database.afterRollback(() => log.push('rollback'))
    return fn()
  })
}

const created: DomainEvent = { name: 'user.created', payload: { id: 'u1' }, occurredAt: '' }
const settle = () => Bun.sleep(0)

describe('the bus', () => {
  test('writes the jobs in the transaction, and runs the rest once it commits', async () => {
    const log: string[] = []
    const base = new ContextBase({ name: 'shop', platform, database: await loggedDatabase(log) })
    base.bus.subscribe('user.created', () => void log.push('in memory'))
    base.bus.subscribe('user.created', () => {}, { strategy: 'handler', queue: 'mail[mailer].sendWelcome_on_user.created' })
    base.worker.wake = () => void log.push('worker woken')

    await logged(base, log, async () => {
      await base.bus.publish(created)
      log.push('save goes on')
    })
    await settle()

    expect(log).toEqual(['begin', 'outbox mail[mailer].sendWelcome_on_user.created', 'save goes on', 'commit', 'worker woken', 'worker woken', 'in memory'])
  })

  test('gives the event one id, the same for its jobs and its handlers in memory, and keeps one it came with', async () => {
    const database = await loggedDatabase([])
    const stored: Job[] = []
    const add = database.outbox.add.bind(database.outbox)
    database.outbox.add = async jobs => {
      stored.push(...jobs)
      await add(jobs)
    }
    const base = new ContextBase({ name: 'shop', platform, database })
    const heard: string[] = []
    base.bus.subscribe('user.created', event => void heard.push(event.id))
    base.bus.subscribe('user.created', () => {}, { strategy: 'handler', queue: 'mail[mailer].sendWelcome_on_user.created' })
    base.bus.subscribe('user.created', () => {}, { strategy: 'handler', queue: 'audit[trail].record_on_user.created' })

    await database.run(() => base.bus.publish(created))
    await database.run(() => base.bus.publish({ ...created, id: 'given' }))
    await settle()

    const ids = stored.map(job => (JSON.parse(job.event) as DomainEvent).id)
    expect(heard).toEqual([ids[0]!, 'given'])
    expect(ids).toEqual([heard[0]!, heard[0]!, 'given', 'given'])
    expect(heard[0]).toMatch(/^[0-9a-f-]{36}$/)
  })

  test('tells who told it, in its jobs and to its handlers in memory: the actor of the use case, or no one', async () => {
    const database = await loggedDatabase([])
    const stored: Job[] = []
    const add = database.outbox.add.bind(database.outbox)
    database.outbox.add = async jobs => {
      stored.push(...jobs)
      await add(jobs)
    }
    const base = new ContextBase({ name: 'shop', platform, database })
    const heard: (string | null | undefined)[] = []
    base.bus.subscribe('user.created', event => void heard.push(event.actor))
    base.bus.subscribe('user.created', () => {}, { strategy: 'handler', queue: 'mail[mailer].sendWelcome_on_user.created' })

    await runAsActor({ userId: 'ana' }, () => database.run(() => base.bus.publish(created)))
    await database.run(() => base.bus.publish(created))
    await settle()

    expect(stored.map(job => (JSON.parse(job.event) as DomainEvent).actor)).toEqual(['ana', null])
    expect(heard).toEqual(['ana', null])
  })

  test('on a rollback, nothing runs', async () => {
    const log: string[] = []
    const base = new ContextBase({ name: 'shop', platform, database: await loggedDatabase(log) })
    base.bus.subscribe('user.created', () => void log.push('in memory'))
    base.worker.wake = () => void log.push('worker woken')

    await logged(base, log, async () => {
      await base.bus.publish(created)
      throw new Error('boom')
    }).catch(() => {})
    await settle()

    expect(log).toEqual(['begin', 'rollback'])
  })

  test('the bus publishes as a repository does', async () => {
    const log: string[] = []
    const base = new ContextBase({ name: 'shop', platform, database: await loggedDatabase(log) })
    base.bus.subscribe('user.created', () => {}, { strategy: 'handler', queue: 'mail[mailer].sendWelcome_on_user.created' })
    base.worker.wake = () => {}

    await logged(base, log, async () => base.bus.publish(created))

    expect(log).toEqual(['begin', 'outbox mail[mailer].sendWelcome_on_user.created', 'commit'])
  })
})

describe('the use case runner', () => {
  test('tells its platform\'s observability of every call, with the context name, and keeps the write rule it was given', async () => {
    const calls: ObservedUseCase[] = []
    const observability: Observability = {
      useCase: (call, run) => {
        calls.push(call)
        return run({ retrying: () => {} })
      },
      warn: () => {},
    }
    const base = new ContextBase({ name: 'shop', database: await loggedDatabase([]), platform: new Platform({ cluster: new MemoryCluster(), observability }), writeRule: 'error' })

    const write = base.useCaseRunner.run('order.place', () => base.useCaseRunner.run('stock.reserve', async () => base.useCaseRunner.checkWriteRule()))

    await expect(write).rejects.toThrow('order.place writes to shop.stock')
    expect(calls[0]).toMatchObject({ context: 'shop', module: 'order', name: 'order.place' })
  })

  test('refuses a context name with a colon, which its rate limits\' keys put after it', () => {
    expect(() => new ContextBase({ name: 'a:http', platform, database: new MemoryDatabase() })).toThrow("A context's name has no ':', a:http")
  })

  test('run a use case again after a conflict as many times as its options say', async () => {
    const base = new ContextBase({ name: 'shop', platform, database: await loggedDatabase([]), conflictRetries: { times: 5, backoffMs: 0 } })
    let runs = 0

    await expect(base.useCaseRunner.run('order.place', async () => {
      runs++;
      throw new StaleVersion()
    })).rejects.toBeInstanceOf(ConcurrencyConflict)

    expect(runs).toBe(6)
  })
})

describe('what reacts to its events', () => {
  test('logs to its context\'s platform: a handler in memory, and a job', async () => {
    const lines: string[] = []
    const platform = new Platform({ cluster: new MemoryCluster(), logger: { write: line => void lines.push(line.message) } })
    const base = new ContextBase({ name: 'shop', database: new MemoryDatabase(), platform })
    base.bus.subscribe('user.created', () => log.info('in memory'))
    base.bus.subscribe('user.created', () => log.info('as a job'), { strategy: 'handler', queue: 'mail[mailer].sendWelcome_on_user.created' })

    await base.bus.publish(created)
    await base.worker.idle()
    await Bun.sleep(0)

    expect(lines.sort()).toEqual(['as a job', 'in memory'])
  })
})

describe('instances of one context', () => {
  test('wake each other\'s worker when one commits new jobs, through their platform\'s cluster', async () => {
    const platform = new Platform({ cluster: new MemoryCluster() })
    const here = new ContextBase({ name: 'shop', database: new MemoryDatabase(), platform })
    const there = new ContextBase({ name: 'shop', database: new MemoryDatabase(), platform })
    const elsewhere = new ContextBase({ name: 'billing', database: new MemoryDatabase(), platform })
    const woken: string[] = []
    there.worker.wake = () => void woken.push('there')
    elsewhere.worker.wake = () => void woken.push('elsewhere')
    here.bus.subscribe('user.created', () => {}, { strategy: 'handler', queue: 'mail[mailer].sendWelcome_on_user.created' })

    await here.bus.publish(created)

    expect(woken).toEqual(['there'])
  })

  test('wake their own worker on their own commit, without waiting to hear it back from their cluster', async () => {
    const deaf: Cluster = { count: async () => 0, increment: async () => 0, forget: async () => {}, publish: async () => {}, subscribe: () => () => {} }
    const base = new ContextBase({ name: 'shop', database: new MemoryDatabase(), platform: new Platform({ cluster: deaf }) })
    const woken: string[] = []
    base.worker.wake = () => void woken.push('here')
    base.bus.subscribe('user.created', () => {}, { strategy: 'handler', queue: 'mail[mailer].sendWelcome_on_user.created' })

    await base.bus.publish(created)
    await settle()

    expect(woken).toEqual(['here'])
  })
})
