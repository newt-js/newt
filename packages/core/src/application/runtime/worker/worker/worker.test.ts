import { afterEach }                 from 'bun:test'
import { describe }                  from 'bun:test'
import { expect }                    from 'bun:test'
import { test }                      from 'bun:test'
// --------------------------------------------------------
import { MemoryDatabase }            from '../../../../adapters/database/memory/memory-database/memory-database'
import { MemoryOutbox }              from '../../../../adapters/database/memory/memory-outbox/memory-outbox'
import { currentActor }              from '../../../../domain/actor/current-actor/current-actor'
import { runAsActor }                from '../../../../domain/actor/run-as-actor/run-as-actor'
import type { Clock }                from '../../../../domain/clock/clock'
import { now }                       from '../../../../domain/clock/now/now'
import type { DomainEvent }          from '../../../../domain/events/event/domain-event'
import type { PublishedEvent }       from '../../../../domain/events/event/published-event'
import type { Observability }        from '../../../../domain/observability/observability'
import { defineScope }               from '../../../../domain/scope/define-scope'
import { AlreadyReceived }           from '../../../../domain/use-case/already-received/already-received'
import { reactionScope }             from '../../../../domain/use-case/reaction-scope/reaction-scope'
import { UseCaseRunner }             from '../../../../domain/use-case/use-case-runner/use-case-runner'
import { workerScope }               from '../../../../domain/use-case/worker-scope/worker-scope'
import { EventId }                   from '../../../../domain/value-objects/event-id/event-id'
import { uuidV7 }                    from '../../../../domain/value-objects/uuid/uuid-v7/uuid-v7'
import { MemoryCluster }             from '../../../cluster/memory-cluster/memory-cluster'
import type { Job }                  from '../../../database/outbox/job'
import type { JobQueueRegistration } from '../../../database/outbox/job-queue-registration'
import type { CapturedLines }        from '../../../platform/capture-lines/capture-lines'
import { captureLines }              from '../../../platform/capture-lines/capture-lines'
import { Platform }                  from '../../../platform/platform/platform'
import type { WorkerOptions }        from '../worker-options'
import { Worker }                    from './worker'

const platform = new Platform({ cluster: new MemoryCluster() })

class WatchedOutbox extends MemoryOutbox {
  registered: JobQueueRegistration[][] = []
  purged: string[] = []
  renewals = 0
  afterClaim: (claimed: Job[]) => void = () => {}
  claimMs = 0
  failRenew = false
  renewMs = 0
  hangingRenews = 0
  renewing = 0
  mostRenewing = 0
  failQueues = false

  override async claim(queues: string[], limit: number, worker: string, leaseUntil: string, now: string): Promise<Job[]> {
    const claimed = await super.claim(queues, limit, worker, leaseUntil, now)
    this.afterClaim(claimed)
    if (claimed.length > 0 && this.claimMs > 0) {
      await Bun.sleep(this.claimMs)
    }
    return claimed
  }

  override async renew(claimed: Job, leaseUntil: string, now: string): Promise<boolean> {
    this.mostRenewing = Math.max(this.mostRenewing, ++this.renewing)
    if (this.hangingRenews-- > 0) {
      await new Promise(() => {})
    }
    try {
      if (this.renewMs > 0) {
        await Bun.sleep(this.renewMs)
      }
    } finally {
      this.renewing--
    }
    if (this.failRenew) {
      throw new Error('renew failed')
    }
    this.renewals++
    return super.renew(claimed, leaseUntil, now)
  }

  override async seen(queues: JobQueueRegistration[], now: string): Promise<void> {
    this.registered.push(queues)
    await super.seen(queues, now)
  }

  override async purge(before: string): Promise<void> {
    this.purged.push(before)
    await super.purge(before)
  }

  override async queues(): Promise<(JobQueueRegistration & { lastSeenAt: string })[]> {
    if (this.failQueues) {
      this.failQueues = false
      throw new Error('queues failed')
    }
    return super.queues()
  }

  async job(queue: string): Promise<Job> {
    return (await this.list()).find(job => job.queue === queue)!
  }

  async change(queue: string, changes: Partial<Pick<Job, 'status' | 'attempts' | 'runAfter' | 'lockedBy' | 'lockedUntil'>>): Promise<void> {
    for (const job of this.jobs.values()) {
      if (job.queue === queue) {
        this.jobs.set(job.id, { ...job, ...changes })
      }
    }
  }

  async clear(): Promise<void> {
    this.jobs.clear()
  }
}

const QUEUE = 'mailer.sendWelcome_on_user.created'

const created = (id = 'u1'): PublishedEvent => ({ id: uuidV7() as EventId, name: 'user.created', payload: { id }, occurredAt: '', actor: null })

async function outboxOf(): Promise<WatchedOutbox> {
  return new WatchedOutbox(new MemoryDatabase())
}

async function setup(options: Partial<WorkerOptions> = {}, observability?: Observability, clock?: Clock) {
  const outbox = await outboxOf()
  const queue = new Worker(outbox, new UseCaseRunner({ observability }), platform, { pollMs: 10, ...options }, clock)
  return { outbox, queue }
}

async function until(done: () => boolean | Promise<boolean>, waitMs = 1_000): Promise<void> {
  const deadline = performance.now() + waitMs
  while (!await done()) {
    if (performance.now() > deadline) {
      throw new Error(`waited ${waitMs} ms, and it never came`)
    }
    await Bun.sleep(1)
  }
}

const msFromNow = (iso: string | null | undefined) => Date.parse(iso!) - Date.now()

let captured: CapturedLines | null = null
const logLines = () => captured ??= captureLines(platform)

afterEach(async () => {
  captured?.restore()
  captured = null
})

describe('register', () => {
  test('a handler is named after who reacts with what to which event', async () => {
    const { queue } = await setup()

    expect(() => queue.register('mailer.sendWelcome_on_user.updated', 'user.created', () => {})).toThrow("'<module>.<use case it calls>_on_user.created'")
    expect(() => queue.register('Mail[mailer].sendWelcome_on_user.created', 'user.created', () => {})).toThrow()
    expect(() => queue.register('mail.sendWelcome.on.user.created', 'user.created', () => {}))
      .toThrow("A handler of 'user.created' is named '<module>.<use case it calls>_on_user.created', not 'mail.sendWelcome.on.user.created'")
    queue.register(QUEUE, 'user.created', () => {})
  })

  test('refuses a concurrency that is not a whole number from 1', async () => {
    const outbox = await outboxOf()
    const queueOf = (concurrency: number | undefined) => new Worker(outbox, new UseCaseRunner(), platform, { concurrency })
    for (const concurrency of [0, -1, 1.5]) {
      expect(() => queueOf(concurrency)).toThrow('concurrency is a whole number from 1')
    }
    queueOf(1)
    queueOf(undefined)
  })

  test('refuses attempts that are not a whole number from 1', async () => {
    const { queue } = await setup()

    for (const attempts of [0, -1, 1.5]) {
      expect(() => queue.register(QUEUE, 'user.created', () => {}, attempts)).toThrow('attempts are a whole number from 1')
    }
    queue.register(QUEUE, 'user.created', () => {}, 1)
  })

  test('refuses a name twice, and takes it again once unregistered', async () => {
    const { queue } = await setup()

    const unregister = queue.register(QUEUE, 'user.created', () => {})
    expect(() => queue.register(QUEUE, 'user.created', () => {})).toThrow('subscribed already')
    unregister()
    queue.register(QUEUE, 'user.created', () => {})
  })
})

describe('enqueue', () => {
  test('writes one pending job for each handler the event concerns', async () => {
    const { outbox, queue } = await setup()
    queue.register(QUEUE, 'user.created', () => {})
    queue.register('trail.record_on_user.*', 'user.*', () => {})
    queue.register('mailer.sendBye_on_user.deleted', 'user.deleted', () => {})

    await queue.enqueue(created())

    expect((await outbox.list()).map(job => job.queue).sort()).toEqual([QUEUE, 'trail.record_on_user.*'])
    expect(await outbox.job(QUEUE)).toMatchObject({ status: 'pending', attempts: 0, lockedBy: null, lockedUntil: null, lastError: null })
    const [first, second] = (await outbox.list()).map(job => JSON.parse(job.event) as DomainEvent)
    expect(first).toEqual({ ...created(), id: expect.any(String), actor: null })
    expect(second!.id).toBe(first!.id!)
  })

  test('writes no job for an event a handler does not take', async () => {
    const { outbox, queue } = await setup()
    queue.register(QUEUE, 'user.created', () => {}, undefined, payload => (payload as { id: string }).id !== 'u2')

    await queue.enqueue(created('u1'))
    await queue.enqueue(created('u2'))

    expect((await outbox.list()).map(job => JSON.parse(job.event).payload)).toEqual([{ id: 'u1' }])
  })

  test('writes nothing when no handler is concerned', async () => {
    const { outbox, queue } = await setup()
    let added = 0
    outbox.add = async () => {
      added++
    }

    await queue.enqueue(created())

    expect(added).toBe(0)
  })
})

describe('a job', () => {
  test('runs its handler with the event, in a worker, as nobody, and ends done', async () => {
    const { outbox, queue } = await setup()
    const seen: unknown[] = []
    queue.register(QUEUE, 'user.created', event => {
      seen.push(event.payload, workerScope.get())
      try {
        currentActor()
      } catch {
        seen.push('nobody')
      }
    })
    await queue.enqueue(created())

    await queue.idle()

    expect(seen).toEqual([{ id: 'u1' }, true, 'nobody'])
    expect(await outbox.job(QUEUE)).toMatchObject({ status: 'done', attempts: 1, lastError: null })
  })

  test('runs its handler as a reaction to its event, in its queue, not received yet', async () => {
    const { queue } = await setup()
    const seen: unknown[] = []
    queue.register(QUEUE, 'user.created', () => void seen.push(reactionScope.get()))
    const event = created()
    await queue.enqueue(event)

    await queue.idle()

    expect(seen).toEqual([{ event: event.id, queue: QUEUE, received: false }])
  })

  test('whose reaction was received already ends done, as one that ran', async () => {
    const { outbox, queue } = await setup()
    queue.register(QUEUE, 'user.created', event => {
      throw new AlreadyReceived(event.id, QUEUE)
    })
    await queue.enqueue(created())

    await queue.idle()

    expect(await outbox.job(QUEUE)).toMatchObject({ status: 'done', attempts: 1, lastError: null })
  })

  test('that fails waits to run again, twice as long each time, up to a cap', async () => {
    const { outbox, queue } = await setup({ backoffMs: 1_000, maxBackoffMs: 1_500 })
    queue.register(QUEUE, 'user.created', () => {
      throw new Error('smtp down')
    })
    await queue.enqueue(created())

    await queue.idle()
    const first = await outbox.job(QUEUE)
    expect(first).toMatchObject({ status: 'pending', attempts: 1 })
    expect(first.lastError).toContain('smtp down')
    expect(msFromNow(first.runAfter)).toBeGreaterThan(900)
    expect(msFromNow(first.runAfter)).toBeLessThanOrEqual(1_000)

    await outbox.change(QUEUE, { runAfter: new Date(0).toISOString() })
    await queue.idle()
    expect(msFromNow((await outbox.job(QUEUE)).runAfter)).toBeGreaterThan(1_400)
    expect(msFromNow((await outbox.job(QUEUE)).runAfter)).toBeLessThanOrEqual(1_500)
  })

  test('runs by its clock: due, retried and run again once it moves, with no wait', async () => {
    let time = Date.parse('2026-01-01T00:00:00.000Z')
    const clock: Clock = { now: () => new Date(time) }
    const { outbox, queue } = await setup({ backoffMs: 60_000 }, undefined, clock)
    const times: string[] = []
    queue.register(QUEUE, 'user.created', () => {
      times.push(now().toISOString())
      if (times.length === 1) {
        throw new Error('smtp down')
      }
    })
    await queue.enqueue(created())
    expect(await outbox.job(QUEUE)).toMatchObject({ createdAt: '2026-01-01T00:00:00.000Z', runAfter: '2026-01-01T00:00:00.000Z' })

    await queue.idle()
    expect(await outbox.job(QUEUE)).toMatchObject({ status: 'pending', runAfter: '2026-01-01T00:01:00.000Z' })
    time += 59_000
    await queue.idle()
    expect(times).toHaveLength(1)
    time += 1_000
    await queue.idle()

    expect(await outbox.job(QUEUE)).toMatchObject({ status: 'done', attempts: 2 })
    expect(times).toEqual(['2026-01-01T00:00:00.000Z', '2026-01-01T00:01:00.000Z'])
  })

  test('is dead once it failed as many times as its handler allows', async () => {
    const { outbox, queue } = await setup()
    queue.register(QUEUE, 'user.created', () => {
      throw new Error('smtp down')
    }, 2)
    await queue.enqueue(created())

    await queue.idle()
    await outbox.change(QUEUE, { runAfter: new Date(0).toISOString() })
    await queue.idle()

    expect(await outbox.job(QUEUE)).toMatchObject({ status: 'dead', attempts: 2 })
    expect((await outbox.job(QUEUE)).lastError).toContain('smtp down')
  })

  test('whose worker stopped mid-run on every attempt is dead, without running again', async () => {
    const { outbox, queue } = await setup()
    let ran = false
    queue.register(QUEUE, 'user.created', () => {
      ran = true
    }, 1)
    await outbox.add([{ ...pendingJob(), status: 'running', attempts: 1, lockedUntil: new Date(0).toISOString() }])

    await queue.idle()

    expect(ran).toBe(false)
    expect(await outbox.job(QUEUE)).toMatchObject({ status: 'dead', lastError: 'Its worker stopped before it finished, on every attempt' })
  })

  test('whose handler was unsubscribed once claimed gives its attempt back: subscribed again, it runs', async () => {
    const { outbox, queue } = await setup()
    let ran = 0
    const unregister = queue.register(QUEUE, 'user.created', () => {}, 1)
    await outbox.add([pendingJob()])
    outbox.afterClaim = () => {
      outbox.afterClaim = () => {}
      unregister()
    }
    await queue.idle()

    queue.register(QUEUE, 'user.created', () => void ran++, 1)
    await outbox.change(QUEUE, { runAfter: new Date(0).toISOString() })
    await queue.idle()

    expect(ran).toBe(1)
    expect(await outbox.job(QUEUE)).toMatchObject({ status: 'done' })
  })

  test('whose handler was unsubscribed once claimed goes back to wait, keeping its last error', async () => {
    const { outbox, queue } = await setup({ pollMs: 2_000 })
    const unregister = queue.register(QUEUE, 'user.created', () => {})
    await outbox.add([{ ...pendingJob(), lastError: 'before' }])
    outbox.afterClaim = () => unregister()

    await queue.idle()

    expect(await outbox.job(QUEUE)).toMatchObject({ status: 'pending', attempts: 0, lastError: 'before' })
    expect(msFromNow((await outbox.job(QUEUE)).runAfter)).toBeGreaterThan(1_900)
  })

  test('keeps its lease while its handler runs, and no longer once it ends', async () => {
    const { outbox, queue } = await setup({ leaseMs: 30 })
    queue.register(QUEUE, 'user.created', () => Bun.sleep(40))
    await queue.enqueue(created())

    await queue.idle()
    const renewals = outbox.renewals
    await Bun.sleep(30)

    expect(renewals).toBeGreaterThanOrEqual(2)
    expect(outbox.renewals).toBe(renewals)
  })

  test('renews one at a time: a renew that answers late never puts back an older lease', async () => {
    const { outbox, queue } = await setup({ leaseMs: 30 })
    outbox.renewMs = 22
    let aborted = false
    queue.register(QUEUE, 'user.created', async (event, signal) => {
      await Bun.sleep(90)
      aborted = signal!.aborted
    })
    await queue.enqueue(created())

    await queue.idle()

    expect(outbox.renewals).toBeGreaterThanOrEqual(1)
    expect(outbox.mostRenewing).toBe(1)
    expect(aborted).toBe(false)
    expect((await outbox.job(QUEUE)).status).toBe('done')
    await Bun.sleep(30)
  })

  describe('whose renew does not answer before the lease it asked for ran out has its signal aborted', () => {
    const hung = async (queue: Worker, meanwhile = async () => {}) => {
      let reason: unknown
      queue.register(QUEUE, 'user.created', async (event, signal) => {
        await meanwhile()
        await new Promise(resolve => {
          signal!.addEventListener('abort', resolve)
          setTimeout(resolve, 300)
        })
        reason = signal!.reason
      })
      await queue.enqueue(created())
      await queue.idle()
      return String(reason)
    }

    test('when every later renew says another claim took it', async () => {
      const { outbox, queue } = await setup({ leaseMs: 30 })
      outbox.hangingRenews = 1
      const taken = () => outbox.change(QUEUE, { lockedBy: 'other/1', attempts: 2, lockedUntil: new Date(Date.now() + 60_000).toISOString() })
      expect(await hung(queue, taken)).toContain('lost its lease')
    })

    test('when every later renew fails', async () => {
      const { outbox, queue } = await setup({ leaseMs: 30 })
      logLines()
      outbox.hangingRenews = 1
      outbox.failRenew = true
      expect(await hung(queue)).toContain('lost its lease')
    })

    test('when every renew hangs', async () => {
      const { outbox, queue } = await setup({ leaseMs: 30 })
      outbox.hangingRenews = Infinity
      expect(await hung(queue)).toContain('its renew did not answer before the lease it asked for ran out')
    })
  })

  test('whose lease cannot be renewed still runs: the failure is only logged', async () => {
    const { outbox, queue } = await setup({ leaseMs: 30 })
    const logged = logLines().said('error')
    outbox.failRenew = true
    queue.register(QUEUE, 'user.created', () => Bun.sleep(25))
    await queue.enqueue(created())

    await queue.idle()

    expect((await outbox.job(QUEUE)).status).toBe('done')
    expect(String(logged[0])).toContain('renewing the lease')
  })

  test('whose lease another claim took has its signal aborted, and closes nothing nor is counted', async () => {
    const { outbox, queue } = await setup({ leaseMs: 30 })
    const flows: string[] = []
    queue.onFlow(({ kind }) => void flows.push(kind))
    let reason: unknown
    queue.register(QUEUE, 'user.created', async (event, signal) => {
      await outbox.change(QUEUE, { lockedBy: 'other/1', attempts: 2 })
      await new Promise(resolve => signal!.addEventListener('abort', resolve))
      reason = signal!.reason
      signal!.throwIfAborted()
    })
    await queue.enqueue(created())

    await queue.idle()

    expect(String(reason)).toContain('lost its lease')
    expect(await outbox.job(QUEUE)).toMatchObject({ status: 'running', lockedBy: 'other/1', lastError: null })
    expect(flows).toEqual([])
  })

  test('whose lease ran out while it could not be renewed has its signal aborted', async () => {
    let time = Date.now()
    const { outbox, queue } = await setup({ leaseMs: 30, concurrency: 1 }, undefined, { now: () => new Date(time) })
    outbox.failRenew = true
    logLines()
    let aborted = false
    queue.register(QUEUE, 'user.created', async (event, signal) => {
      time += 60
      await new Promise(resolve => signal!.addEventListener('abort', resolve))
      aborted = signal!.aborted
    })
    await queue.enqueue(created())

    await queue.idle()

    expect(aborted).toBe(true)
    expect(await outbox.job(QUEUE)).toMatchObject({ status: 'done', attempts: 1 })
  })

  test('is counted once the database took its close, never before nor for a close it refused', async () => {
    const { outbox, queue } = await setup()
    const flows: string[] = []
    let closed = false
    queue.onFlow(({ kind }) => void flows.push(`${kind}${closed ? ' after close' : ' before close'}`))
    const close = outbox.close.bind(outbox)
    outbox.close = async (claimed, closing, now) => {
      await Bun.sleep(5)
      closed = await close(claimed, closing, now)
      return closed
    }
    queue.register(QUEUE, 'user.created', () => {})
    await queue.enqueue(created())
    await queue.idle()

    logLines()
    outbox.close = async () => false
    await queue.enqueue(created('u2'))
    await queue.idle()

    expect(flows).toEqual(['delivered after close'])
  })

  test('is told to every listener, each on its own: one that throws is said, one forgotten is told no more', async () => {
    const { queue } = await setup()
    const first: string[] = []
    const second: string[] = []
    const lines = logLines()
    queue.onFlow(() => {
      throw new Error('metrics broke')
    })
    const forget = queue.onFlow(({ kind }) => void first.push(kind))
    queue.onFlow(({ kind }) => void second.push(kind))
    queue.register(QUEUE, 'user.created', () => {})
    await queue.enqueue(created())
    await queue.idle()
    forget()
    await queue.enqueue(created('u2'))
    await queue.idle()

    expect(first).toEqual(['delivered'])
    expect(second).toEqual(['delivered', 'delivered'])
    expect(lines.said('error')).toEqual([`[Worker] a job of ${QUEUE} closed delivered could not be counted`, `[Worker] a job of ${QUEUE} closed delivered could not be counted`])
  })

  test('that failed after its lease was lost warns, as one that succeeded does', async () => {
    const { outbox, queue } = await setup()
    const warned = logLines().said('warn')
    outbox.close = async () => false
    queue.register(QUEUE, 'user.created', () => {
      throw new Error('smtp down')
    })
    await queue.enqueue(created())

    await queue.idle()

    expect(String(warned[0])).toContain('lost its lease')
  })

  test('a renew on its way when the handler ends aborts nothing, even if it says the claim is gone', async () => {
    const { outbox, queue } = await setup({ leaseMs: 30 })
    const renewing = Promise.withResolvers<boolean>()
    outbox.renew = () => renewing.promise
    let signal: AbortSignal | undefined
    queue.register(QUEUE, 'user.created', async (_event, given) => {
      signal = given
      await Bun.sleep(15)
    })
    await queue.enqueue(created())

    await queue.idle()
    renewing.resolve(false)
    await Bun.sleep(1)

    expect(signal!.aborted).toBe(false)
  })

  test('the meta of a handler subscribed as a job carries its signal', async () => {
    const { queue } = await setup()
    let signal: AbortSignal | undefined
    queue.register(QUEUE, 'user.created', (_event, given) => {
      signal = given
    })
    await queue.enqueue(created())

    await queue.idle()

    expect(signal).toBeInstanceOf(AbortSignal)
    expect(signal!.aborted).toBe(false)
  })
})

describe('stop', () => {
  test('waits for the jobs in progress', async () => {
    const { outbox, queue } = await setup({ pollMs: 5 })
    queue.register(QUEUE, 'user.created', () => Bun.sleep(20))
    await queue.enqueue(created())
    queue.start()
    await until(async () => (await outbox.job(QUEUE)).status === 'running')

    await queue.stop(1_000)

    expect((await outbox.job(QUEUE)).status).toBe('done')
  })

  test('aborts the signal of a job still running at its deadline; one that heeds it goes back to wait, due at once, on its last attempt too, and is counted as nothing', async () => {
    const { outbox, queue } = await setup({ pollMs: 5 })
    const flows: string[] = []
    queue.onFlow(({ kind }) => void flows.push(kind))
    const unregister = queue.register(QUEUE, 'user.created', async (_event, signal) => {
      await new Promise(resolve => signal!.addEventListener('abort', resolve))
      signal!.throwIfAborted()
    }, 2)
    await outbox.add([{ ...pendingJob(), attempts: 1, lastError: 'smtp down' }])
    queue.start()
    await until(async () => (await outbox.job(QUEUE)).status === 'running')

    const started = performance.now()
    await queue.stop(30)

    expect(performance.now() - started).toBeLessThan(500)
    expect(await outbox.job(QUEUE)).toMatchObject({ status: 'pending', attempts: 1, lockedBy: null, lastError: 'smtp down' })
    expect(msFromNow((await outbox.job(QUEUE)).runAfter)).toBeLessThanOrEqual(0)
    expect(flows).toEqual([])

    unregister()
    queue.register(QUEUE, 'user.created', () => {}, 2)
    await queue.idle()
    expect(await outbox.job(QUEUE)).toMatchObject({ status: 'done', attempts: 2 })
    expect(flows).toEqual(['delivered'])
  })

  test('renews no more the lease of a job it gave up on', async () => {
    const { outbox, queue } = await setup({ pollMs: 5, leaseMs: 30 })
    logLines()
    const hung = Promise.withResolvers<void>()
    queue.register(QUEUE, 'user.created', () => hung.promise)
    await queue.enqueue(created())
    queue.start()
    await until(async () => (await outbox.job(QUEUE)).status === 'running')

    await queue.stop(5)
    const renewals = outbox.renewals
    await Bun.sleep(40)

    expect(outbox.renewals).toBe(renewals)
    hung.resolve()
    await until(async () => (await outbox.job(QUEUE)).status !== 'running')
  })

  test('a job that fails otherwise once its signal is aborted by a stop is a failure as any: counted, its error kept', async () => {
    const { outbox, queue } = await setup({ pollMs: 5, backoffMs: 60_000 })
    const flows: string[] = []
    queue.onFlow(({ kind }) => void flows.push(kind))
    queue.register(QUEUE, 'user.created', async (_event, signal) => {
      await new Promise(resolve => signal!.addEventListener('abort', resolve))
      throw new Error('the rollback failed')
    })
    await queue.enqueue(created())
    queue.start()
    await until(async () => (await outbox.job(QUEUE)).status === 'running')

    await queue.stop(30)

    expect(await outbox.job(QUEUE)).toMatchObject({ status: 'pending', attempts: 1 })
    expect((await outbox.job(QUEUE)).lastError).toContain('the rollback failed')
    expect(msFromNow((await outbox.job(QUEUE)).runAfter)).toBeGreaterThan(50_000)
    expect(flows).toEqual(['redelivered'])
  })

  test('started again while a stop waits for its deadline, the jobs it claims then are none of that stop\'s', async () => {
    const { outbox, queue } = await setup({ pollMs: 5 })
    const warned = logLines().said('warn')
    const signals: AbortSignal[] = []
    const hung = Promise.withResolvers<void>()
    queue.register(QUEUE, 'user.created', (_event, signal) => {
      signals.push(signal!)
      return hung.promise
    })
    await queue.enqueue(created('u1'))
    queue.start()
    await until(async () => (await outbox.job(QUEUE)).status === 'running')

    const stopping = queue.stop(40)
    await Bun.sleep(5)
    queue.start()
    await queue.enqueue(created('u2'))
    queue.wake()
    await until(() => signals.length === 2)
    await until(() => signals[0]!.aborted)

    expect(signals.map(signal => signal.aborted)).toEqual([true, false])
    await until(() => warned.length > 0, 2_000)
    expect(String(warned[0])).toContain('1 job(s) still run after the stop\'s deadline')
    hung.resolve()
    await stopping
    await queue.stop()
    expect((await outbox.list()).map(job => job.status)).toEqual(['done', 'done'])
  })

  test('started again while a claim is on its way, the claims after it are the new start\'s: that stop neither aborts nor waits for them', async () => {
    const { outbox, queue } = await setup({ pollMs: 5, concurrency: 3 })
    const signals = new Map<unknown, AbortSignal>()
    const hung = Promise.withResolvers<void>()
    queue.register(QUEUE, 'user.created', async (event, signal) => {
      signals.set((event.payload as { id: string }).id, signal!)
      if ((event.payload as { id: string }).id === 'u2') {
        await hung.promise
      }
    })
    outbox.claimMs = 40
    await queue.enqueue(created('u1'))
    queue.start()
    await Bun.sleep(10)

    let stopped = false
    const stopping = queue.stop(100).then(() => {
      stopped = true
    })
    queue.start()
    await queue.enqueue(created('u2'))
    await until(() => signals.has('u2'))
    await until(() => stopped)
    await Bun.sleep(110)

    expect(signals.get('u2')!.aborted).toBe(false)
    hung.resolve()
    await stopping
    await queue.stop()
  })

  test('called while a claim is on its way, aborts the jobs of that claim at its deadline, and claims no more', async () => {
    const { outbox, queue } = await setup({ pollMs: 5 })
    const signals: AbortSignal[] = []
    queue.register(QUEUE, 'user.created', async (_event, signal) => {
      signals.push(signal!)
      await new Promise(resolve => signal!.addEventListener('abort', resolve))
      signal!.throwIfAborted()
    })
    outbox.claimMs = 50
    let claims = 0
    outbox.afterClaim = () => void claims++
    await queue.enqueue(created('u1'))
    queue.start()
    await until(async () => (await outbox.job(QUEUE)).status === 'running')

    const stopping = queue.stop(100)
    await queue.enqueue(created('u2'))
    const claimsAtStop = claims
    await stopping

    expect(signals.map(signal => signal.aborted)).toEqual([true])
    expect((await outbox.list()).map(job => job.status)).toEqual(['pending', 'pending'])
    expect(claims).toBe(claimsAtStop)
  })

  test('leaves a job that ignores its signal to its lease, and resolves all the same', async () => {
    const { outbox, queue } = await setup({ pollMs: 5 })
    const warned = logLines().said('warn')
    const hung = Promise.withResolvers<void>()
    queue.register(QUEUE, 'user.created', () => hung.promise)
    await queue.enqueue(created())
    queue.start()
    await until(async () => (await outbox.job(QUEUE)).status === 'running')

    const started = performance.now()
    await queue.stop(30)

    expect(performance.now() - started).toBeLessThan(2_000)
    expect((await outbox.job(QUEUE)).status).toBe('running')
    expect(String(warned[0])).toContain('still run after the stop\'s deadline')
    hung.resolve()
    await until(async () => (await outbox.job(QUEUE)).status !== 'running')
  })
})

describe('the worker', () => {
  test('runs at most `concurrency` jobs at once', async () => {
    const { outbox, queue } = await setup({ concurrency: 2 })
    let running = 0
    let most = 0
    queue.register(QUEUE, 'user.created', async () => {
      most = Math.max(most, ++running)
      await Bun.sleep(5)
      running--
    })
    for (const id of ['u1', 'u2', 'u3', 'u4']) {
      await queue.enqueue(created(id))
    }

    await queue.idle()

    expect(most).toBe(2)
    expect((await outbox.list()).every(job => job.status === 'done')).toBe(true)
  })

  test('and an `idle` beside it keep to `concurrency` together', async () => {
    const { outbox, queue } = await setup({ concurrency: 2, pollMs: 60_000 })
    outbox.claimMs = 10
    let running = 0
    let most = 0
    queue.register(QUEUE, 'user.created', async () => {
      most = Math.max(most, ++running)
      await Bun.sleep(5)
      running--
    })
    for (const id of ['u1', 'u2', 'u3', 'u4', 'u5', 'u6']) {
      await queue.enqueue(created(id))
    }

    queue.start()
    await Bun.sleep(5)
    await queue.idle()
    await queue.stop()

    expect(most).toBe(2)
    expect((await outbox.list()).every(job => job.status === 'done')).toBe(true)
  })

  test('idle waits for the jobs of a claim the worker has on its way', async () => {
    const { outbox, queue } = await setup({ pollMs: 60_000 })
    outbox.claimMs = 20
    let claimed = false
    outbox.afterClaim = jobs => {
      claimed ||= jobs.length > 0
    }
    let done = false
    queue.register(QUEUE, 'user.created', async () => {
      await Bun.sleep(5)
      done = true
    })
    await queue.enqueue(created())

    queue.start()
    await until(() => claimed)
    await queue.idle()
    const doneAtIdle = done
    await queue.stop()

    expect(doneAtIdle).toBe(true)
  })

  test('locks each claim with a name of its own, so none before a retry closes one after it', async () => {
    const { outbox, queue } = await setup()
    const locks: (string | null)[] = []
    outbox.afterClaim = claimed => locks.push(...claimed.map(job => job.lockedBy))
    queue.register(QUEUE, 'user.created', () => {
      throw new Error('smtp down')
    }, 1)
    await queue.enqueue(created())

    await queue.idle()
    await outbox.change(QUEUE, { status: 'pending', attempts: 0, runAfter: new Date(0).toISOString() })
    await queue.idle()

    expect(locks).toHaveLength(2)
    expect(new Set(locks).size).toBe(2)
  })

  test('woken, it looks at once instead of waiting for its poll; stopped, it waits for what runs', async () => {
    const { outbox, queue } = await setup({ pollMs: 60_000 })
    const release = Promise.withResolvers<void>()
    queue.register(QUEUE, 'user.created', () => release.promise)
    queue.start()
    queue.start()
    await Bun.sleep(5)

    await queue.enqueue(created())
    queue.wake()
    await until(async () => (await outbox.job(QUEUE)).status === 'running')

    const stopping = queue.stop()
    await Bun.sleep(10)
    release.resolve()
    await stopping
    expect((await outbox.job(QUEUE)).status).toBe('done')
  })

  test('says which queues it serves, at most once a minute, and only when it serves some', async () => {
    const idle = await setup()
    idle.queue.start()
    await Bun.sleep(5)
    await idle.queue.stop()
    expect(idle.outbox.registered).toEqual([])

    const { outbox, queue } = await setup()
    queue.register(QUEUE, 'user.created', () => {}, 3)
    queue.start()
    await until(() => outbox.registered.length > 0)
    await queue.stop()
    queue.start()
    await Bun.sleep(5)
    await queue.stop()

    expect(outbox.registered).toEqual([[{ name: QUEUE, event: 'user.created', attempts: 3 }]])
  })

  test('looks for queues nobody serves as often as it says its own are alive, or as often as it is told', async () => {
    const checks = async (options: Partial<WorkerOptions>, enough: (read: number) => boolean) => {
      const { outbox, queue } = await setup({ pollMs: 2, ...options })
      let read = 0
      outbox.queues = async () => (read++, [])
      queue.register(QUEUE, 'user.created', () => {})
      queue.start()
      await until(() => enough(read) && outbox.registered.length > 0)
      await Bun.sleep(60)
      await queue.stop()
      return { read, seen: outbox.registered.length }
    }

    expect(await checks({ seenEveryMs: 60_000 }, read => read > 0)).toEqual({ read: 1, seen: 1 })
    const often = await checks({ seenEveryMs: 60_000, orphansCheckEveryMs: 5 }, read => read > 2)
    expect(often.seen).toBe(1)
    expect(often.read).toBeGreaterThan(2)
  })

  test('purges the jobs done before their keep, at most once an hour', async () => {
    const { outbox, queue } = await setup({ keepDoneMs: 60_000 })
    queue.start()
    await until(() => outbox.purged.length > 0)
    await Bun.sleep(30)
    await queue.stop()

    expect(outbox.purged).toHaveLength(1)
    expect(msFromNow(outbox.purged[0])).toBeGreaterThan(-61_000)
    expect(msFromNow(outbox.purged[0])).toBeLessThanOrEqual(-60_000)
  })

  test('purges with them the reactions its inbox received before that keep', async () => {
    const outbox = await outboxOf()
    const purged: string[] = []
    const inbox = { has: async () => false, receive: async () => true, purge: async (before: string) => void purged.push(before) }
    const queue = new Worker(outbox, new UseCaseRunner({ inbox }), platform, { pollMs: 10, keepDoneMs: 60_000 })
    queue.start()
    await until(() => purged.length > 0)
    await queue.stop()

    expect(purged).toEqual(outbox.purged)
  })

  test('warns once about jobs waiting in queues no worker serves', async () => {
    const { outbox, queue } = await setup()
    const warnings = logLines().said('warn')
    queue.register(QUEUE, 'user.created', () => {})
    const recently = new Date().toISOString()
    await outbox.add([
      { ...pendingJob(), id: 'a', queue: 'mailer.old_on_user.created', runAfter: '9999' },
      { ...pendingJob(), id: 'b', queue: 'mailer.old_on_user.created', status: 'running', lockedUntil: '9999' },
      { ...pendingJob(), id: 'c', queue: 'mailer.gone_on_user.created', status: 'done' },
      { ...pendingJob(), id: 'd', queue: 'mailer.elsewhere_on_user.created', runAfter: '9999' },
      { ...pendingJob(), id: 'e', queue: QUEUE, runAfter: '9999' },
    ])
    await outbox.seen([{ name: 'mailer.elsewhere_on_user.created', event: 'user.created', attempts: 5 }], recently)

    queue.start()
    await until(() => warnings.length > 0)
    await Bun.sleep(20)
    await queue.stop()

    expect(warnings).toEqual([expect.stringContaining("2 job(s) of 'mailer.old_on_user.created' wait")])
  })

  test('warns about a queue seen moments ago once nobody has served it for a while, as after a deploy that renamed it', async () => {
    const { outbox, queue } = await setup({ pollMs: 5, seenEveryMs: 100 })
    const warnings = logLines().said('warn')
    queue.register(QUEUE, 'user.created', () => {})
    await outbox.add([{ ...pendingJob(), id: 'a', queue: 'mailer.old_on_user.created', runAfter: '9999' }])
    await outbox.seen([{ name: 'mailer.old_on_user.created', event: 'user.created', attempts: 5 }], new Date().toISOString())

    queue.start()
    await Bun.sleep(20)
    const atStart = [...warnings]
    await until(() => warnings.length > 0, 3_000)
    await Bun.sleep(20)
    await queue.stop()

    expect(atStart).toEqual([])
    expect(warnings).toEqual([expect.stringContaining("1 job(s) of 'mailer.old_on_user.created' wait")])
  })

  test('warns again about a queue left alone again, once it was served or emptied', async () => {
    const { outbox, queue } = await setup({ pollMs: 5, seenEveryMs: 5 })
    const warnings = logLines().said('warn')
    queue.register(QUEUE, 'user.created', () => {})
    await outbox.add([{ ...pendingJob(), id: 'a', queue: 'mailer.old_on_user.created', runAfter: '9999' }])

    queue.start()
    await until(() => warnings.length === 1)
    await outbox.clear()
    await Bun.sleep(30)
    await outbox.add([{ ...pendingJob(), id: 'b', queue: 'mailer.old_on_user.created', runAfter: '9999' }])
    await until(() => warnings.length === 2)
    await queue.stop()

    expect(warnings).toHaveLength(2)
  })

  test('runAsWorker runs code as a job runs: in a worker, with no actor, handing back what it gives', async () => {
    const { queue } = await setup()
    const runner = new UseCaseRunner({ writeRule: 'error' })
    const write = () => runner.run('order.place', () => runner.run('stock.reserve', async () => runner.checkWriteRule()))
    await expect(write()).rejects.toThrow('outside a worker')

    const seen = await runAsActor({ userId: 'ana' }, () => queue.runAsWorker(async () => {
      await write()
      let actor = 'none'
      try {
        actor = currentActor().userId
      } catch { /* nobody */ }
      return [workerScope.get(), actor]
    }))

    expect(seen).toEqual([true, 'none'])
    expect(workerScope.get()).toBeUndefined()
  })

  test('runs a job with no actor, even when whoever waits for it has one', async () => {
    const { queue } = await setup()
    let seen = 'not run'
    queue.register(QUEUE, 'user.created', async () => {
      try {
        seen = currentActor().userId
      } catch {
        seen = 'none'
      }
    })
    await queue.enqueue(created())

    await runAsActor({ userId: 'ana' }, () => queue.idle())

    expect(seen).toBe('none')
  })

  test('runs a job with no actor nor scope, even when the queue was made inside them', async () => {
    const workspace = defineScope<string>('workspace')
    const outbox = await outboxOf()
    const queue = await runAsActor({ userId: 'ana' }, () => workspace.run('w1', async () => new Worker(outbox, new UseCaseRunner(), platform)))
    let seen: unknown[] = []
    queue.register(QUEUE, 'user.created', async () => {
      try {
        seen = [currentActor().userId]
      } catch {
        seen = ['nobody']
      }
      seen.push(workspace.get() ?? 'no workspace')
    })
    await queue.enqueue(created())

    await queue.idle()

    expect(seen).toEqual(['nobody', 'no workspace'])
  })

  test('a failure of its own is logged, and it goes on at its next poll', async () => {
    const { outbox, queue } = await setup({ pollMs: 5 })
    const logged = logLines().said('error')
    outbox.failQueues = true
    queue.register(QUEUE, 'user.created', () => {})
    await queue.enqueue(created())

    queue.start()
    await until(async () => (await outbox.job(QUEUE)).status === 'done')
    await queue.stop()

    expect(String(logged[0])).toContain('the worker failed')
    expect((await outbox.job(QUEUE)).status).toBe('done')
  })

  test('each of its steps is observed as a call of its own', async () => {
    const spans: string[] = []
    const observability: Observability = {
      useCase: (call, run) => {
        spans.push(call.name)
        return run({ retrying: () => {} })
      },
      warn: () => {},
    }
    const { queue } = await setup({}, observability)
    queue.register(QUEUE, 'user.created', () => {})
    await queue.enqueue(created())

    await queue.idle()

    expect(spans).toContain('job.claim')
    expect(spans).toContain('job.close')
  })
})

function pendingJob(): Job {
  return {
    id: uuidV7(),
    queue: QUEUE,
    event: JSON.stringify(created()),
    status: 'pending',
    attempts: 0,
    runAfter: new Date(0).toISOString(),
    lockedBy: null,
    lockedUntil: null,
    lastError: null,
    createdAt: '',
    updatedAt: '',
  }
}
