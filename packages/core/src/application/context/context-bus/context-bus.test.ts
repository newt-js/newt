import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
// --------------------------------------------------------
import { MemoryDatabase }   from '../../../adapters/database/memory/memory-database/memory-database'
import type { Actor }       from '../../../domain/actor/actor'
import { currentActor }     from '../../../domain/actor/current-actor/current-actor'
import { NoActor }          from '../../../domain/actor/no-actor/no-actor'
import { runAsActor }       from '../../../domain/actor/run-as-actor/run-as-actor'
import { now }              from '../../../domain/clock/now/now'
import type { DomainEvent } from '../../../domain/events/event/domain-event'
import { defineScope }      from '../../../domain/scope/define-scope'
import { EventId }          from '../../../domain/value-objects/event-id/event-id'
import { MemoryCluster }    from '../../cluster/memory-cluster/memory-cluster'
import { linesOf }          from '../../platform/capture-lines/capture-lines'
import { Platform }         from '../../platform/platform/platform'
import { TestClock }        from '../../testing/test-clock/test-clock'
import { ContextBase }      from '../context-base/context-base'

const platform = new Platform({ cluster: new MemoryCluster() })

const busOf = (make: <T>(fn: () => Promise<T>) => Promise<T> = fn => fn()) => make(async () => new ContextBase({ name: 'shop', platform, database: new MemoryDatabase() }))

const event: DomainEvent = { name: 'test.happened', payload: {}, occurredAt: '' }
const named = (name: string): DomainEvent => ({ name, payload: name, occurredAt: '' })

const settle = () => Bun.sleep(0)

async function errorsOf(fn: () => Promise<unknown>) {
  return (await linesOf(fn, platform)).filter(line => line.level === 'error')
}

describe("a context's bus", () => {
  test("makes a handler subscription a queue of its worker, told to its registry, and forgets both", async () => {
    const base = await busOf()

    const forget = base.bus.subscribe('order.placed', () => {}, { strategy: 'handler', queue: 'mailer.send_on_order.placed', attempts: 2 })
    expect(base.useCaseRunner.registry.subscriptions).toEqual([{ event: 'order.placed', strategy: 'handler', queue: 'mailer.send_on_order.placed', attempts: 2, filtered: false }])
    expect(await base.worker.enqueue({ ...named('order.placed'), id: 'e1' as EventId, actor: null })).toEqual(['mailer.send_on_order.placed'])

    forget()
    expect(base.useCaseRunner.registry.subscriptions).toEqual([])
    expect(await base.worker.enqueue({ ...named('order.placed'), id: 'e2' as EventId, actor: null })).toEqual([])
  })

  test('keeps any other subscription in memory, never among its worker\'s queues', async () => {
    const base = await busOf()

    base.bus.subscribe('order.placed', () => {})

    expect(base.useCaseRunner.registry.subscriptions).toEqual([{ event: 'order.placed', strategy: 'fire-and-forget', queue: null, attempts: null, filtered: null }])
    expect(await base.worker.enqueue({ ...named('order.placed'), id: 'e1' as EventId, actor: null })).toEqual([])
  })
})

describe('a handler in memory', () => {
  test('does not inherit the actor of whatever published: it reacts as the system', async () => {
    const { bus } = await busOf()
    const seen: unknown[] = []
    bus.subscribe('test.happened', () => {
      try {
        seen.push(currentActor())
      } catch (error) {
        seen.push(error instanceof NoActor ? 'nobody' : error)
      }
    })

    await runAsActor({ userId: 'ana' } satisfies Actor, async () => {
      await bus.publish(event)
      await settle()
    })

    expect(seen).toEqual(['nobody'])
  })

  test('inherits no actor nor scope of whatever made the bus, as a context opened inside a request', async () => {
    const workspace = defineScope<string>('workspace')
    const { bus } = await busOf(fn => runAsActor({ userId: 'ana' }, () => workspace.run('w1', fn)))
    const seen: unknown[] = []
    bus.subscribe('test.happened', () => {
      try {
        seen.push(currentActor())
      } catch (error) {
        seen.push(error instanceof NoActor ? 'nobody' : error)
      }
      seen.push(workspace.get() ?? 'no workspace')
    })

    await bus.publish(event)
    await settle()

    expect(seen).toEqual(['nobody', 'no workspace'])
  })

  test("reads the time of its context's clock, as a job does", async () => {
    const clock = new TestClock('2026-03-01T10:00:00.000Z')
    const { bus } = new ContextBase({ name: 'shop', platform, database: new MemoryDatabase(), clock })
    const seen: string[] = []
    bus.subscribe('test.happened', () => {
      seen.push(now().toISOString())
    })

    await bus.publish(event)
    await settle()

    expect(seen).toEqual(['2026-03-01T10:00:00.000Z'])
  })

  test('runs after publish returns, not during it', async () => {
    const { bus } = await busOf()
    const seen: unknown[] = []
    bus.subscribe('test.happened', () => {
      seen.push('ran')
    })

    const publishing = bus.publish(event)

    expect(seen).toEqual([])
    await publishing
  })

  test('that throws does not bring the publisher down, it only logs', async () => {
    const { bus } = await busOf()
    bus.subscribe('test.happened', () => {
      throw new Error('boom')
    })

    const logged = await errorsOf(async () => {
      await bus.publish(event)
      await settle()
    })

    expect(logged).toHaveLength(1)
  })

  test('that rejects later is logged too', async () => {
    const { bus } = await busOf()
    bus.subscribe('test.happened', async () => {
      await settle()
      throw new Error('boom')
    })

    const logged = await errorsOf(async () => {
      await bus.publish(event)
      await Bun.sleep(5)
    })

    expect(logged).toHaveLength(1)
  })

  test('hears only the events its `when` takes, by their payload', async () => {
    const { bus } = await busOf()
    const seen: unknown[] = []
    bus.subscribe('user.*', each => {
      seen.push(each.payload)
    }, { strategy: 'fire-and-forget', when: payload => payload !== 'user.deleted' })

    await bus.publish(named('user.created'))
    await bus.publish(named('user.deleted'))
    await settle()

    expect(seen).toEqual(['user.created'])
  })
})

describe('subscriptions in memory', () => {
  test('every one the event concerns runs, by name or by prefix, and no other', async () => {
    const { bus } = await busOf()
    const seen: string[] = []
    bus.subscribe('user.created', () => {
      seen.push('exact')
    })
    bus.subscribe('user.*', () => {
      seen.push('prefix')
    })
    bus.subscribe('order.*', () => {
      seen.push('other')
    })

    await bus.publish(named('user.created'))
    await settle()

    expect(seen.sort()).toEqual(['exact', 'prefix'])
  })

  test('one that throws keeps none of the others from running', async () => {
    const { bus } = await busOf()
    const seen: string[] = []
    bus.subscribe('user.created', () => {
      throw new Error('boom')
    })
    bus.subscribe('user.created', () => {
      seen.push('second')
    })

    await errorsOf(async () => {
      await bus.publish(named('user.created'))
      await settle()
    })

    expect(seen).toEqual(['second'])
  })

  test('unsubscribing ends that one only', async () => {
    const { bus } = await busOf()
    const seen: string[] = []
    const unsubscribe = bus.subscribe('user.created', () => {
      seen.push('gone')
    })
    bus.subscribe('user.created', () => {
      seen.push('stays')
    })

    unsubscribe()
    await bus.publish(named('user.created'))
    await settle()

    expect(seen).toEqual(['stays'])
  })
})
