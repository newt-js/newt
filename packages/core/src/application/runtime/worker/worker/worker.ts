import type { Clock }              from '../../../../domain/clock/clock'
import { clockScope }              from '../../../../domain/clock/clock-scope/clock-scope'
import { systemClock }             from '../../../../domain/clock/system-clock/system-clock'
import type { EventHandler }       from '../../../../domain/events/bus/event-handler'
import { eventOfQueue }            from '../../../../domain/events/event-of-queue/event-of-queue'
import type { Json }               from '../../../../domain/events/event/json'
import type { PublishedEvent }     from '../../../../domain/events/event/published-event'
import type { Page }               from '../../../../domain/pagination/page'
import { toPage }                  from '../../../../domain/pagination/to-page/to-page'
import { AlreadyReceived }         from '../../../../domain/use-case/already-received/already-received'
import { reactionScope }           from '../../../../domain/use-case/reaction-scope/reaction-scope'
import { UseCaseRunner }           from '../../../../domain/use-case/use-case-runner/use-case-runner'
import { workerScope }             from '../../../../domain/use-case/worker-scope/worker-scope'
import { uuidV7 }                  from '../../../../domain/value-objects/uuid/uuid-v7/uuid-v7'
import type { Job }                from '../../../database/outbox/job'
import type { JobClosing }         from '../../../database/outbox/job-closing'
import type { Outbox }             from '../../../database/outbox/outbox'
import { detached }                from '../../../platform/detached/detached'
import { log }                     from '../../../platform/log/log'
import { platformScope }           from '../../../platform/platform-scope/platform-scope'
import { Platform }                from '../../../platform/platform/platform'
import { eventNameMatches }        from '../../event-name-matches/event-name-matches'
import { PollLoop }                from '../../poll-loop/poll-loop'
import type { DeadJob }            from '../dead-job'
import { eventNameOf }             from '../event-name-of/event-name-of'
import type { JobFlow }            from '../job-flow'
import type { QueueState }         from '../queue-state'
import { settlesWithin }           from '../settles-within/settles-within'
import { warnLost }                from '../warn-lost/warn-lost'
import type { WorkerOptions }      from '../worker-options'
import type { WorkerOptionsGiven } from '../worker-options'
import { WorkerStopped }           from '../worker-stopped/worker-stopped'

type Registration = { pattern: string, handler: EventHandler, attempts: number, when?: ((payload: Json) => boolean) | undefined }

const DEFAULTS: Omit<WorkerOptions, 'orphansCheckEveryMs'> = {
  concurrency: 10,
  pollMs: 5_000,
  leaseMs: 60_000,
  backoffMs: 10_000,
  maxBackoffMs: 15 * 60_000,
  keepDoneMs: 7 * 24 * 60 * 60_000,
  seenEveryMs: 60_000,
}

const DEFAULT_ATTEMPTS = 5

const PURGE_EVERY_MS = 60 * 60_000

const STOP_TIMEOUT_MS = 10_000

export const ABORTED_GRACE_MS = 1_000

export class Worker {

  private readonly registrations = new Map<string, Registration>()
  private readonly id = uuidV7()
  private claims = 0
  private readonly options: WorkerOptions
  private readonly inFlight = new Map<Promise<void>, number>()
  private readonly claiming = new Map<Promise<unknown>, number>()
  private readonly running = new Map<AbortController, number>()
  private epoch = 0
  private readonly loop = new PollLoop(() => this.look(), () => this.options.pollMs, '[Worker] the worker failed, it goes on at its next poll')
  private purgedAt = 0
  private seenAt = 0
  private orphansCheckedAt = 0
  private readonly orphansWarned = new Set<string>()
  private readonly flows = new Set<(step: JobFlow) => void>()

  constructor(
    private readonly outbox: Outbox,
    private readonly useCaseRunner: UseCaseRunner,
    private readonly platform: Platform,
    options: WorkerOptionsGiven = {},
    private readonly clock: Clock = systemClock,
  ) {
    const given: Partial<WorkerOptions> = Object.fromEntries(Object.entries(options).filter(([, value]) => value !== undefined))
    this.options = { ...DEFAULTS, orphansCheckEveryMs: given.seenEveryMs ?? DEFAULTS.seenEveryMs, ...given }
    const { concurrency } = this.options
    if (!Number.isInteger(concurrency) || concurrency < 1) {
      throw new Error(`A worker runs at least one job at a time: its concurrency is a whole number from 1, not ${concurrency}`)
    }
  }

  register(name: string, pattern: string, handler: EventHandler, attempts = DEFAULT_ATTEMPTS, when?: (payload: Json) => boolean): () => void {
    if (eventOfQueue(name) !== pattern) {
      throw new Error(`A handler of '${pattern}' is named '<feature>[<module>].<use case it calls>_on_${pattern}', not '${name}'`)
    }
    if (!Number.isInteger(attempts) || attempts < 1) {
      throw new Error(`The handler '${name}' runs at least once: its attempts are a whole number from 1, not ${attempts}`)
    }
    if (this.registrations.has(name)) {
      throw new Error(`A handler named '${name}' is subscribed already`)
    }
    this.registrations.set(name, { pattern, handler, attempts, when })
    return () => {
      this.registrations.delete(name)
    }
  }

  onFlow(listener: (step: JobFlow) => void): () => void {
    const each = (step: JobFlow) => listener(step)
    this.flows.add(each)
    return () => {
      this.flows.delete(each)
    }
  }

  async enqueue(event: PublishedEvent): Promise<string[]> {
    const now = this.clock.now().toISOString()
    const jobs: Job[] = [...this.registrations]
      .filter(([, registration]) => eventNameMatches(registration.pattern, event.name) && (registration.when?.(event.payload) ?? true))
      .map(([queue]) => ({ id: uuidV7(), queue, event: JSON.stringify(event), status: 'pending', attempts: 0, runAfter: now, lockedBy: null, lockedUntil: null, lastError: null, createdAt: now, updatedAt: now }))
    if (jobs.length > 0) {
      await this.outbox.add(jobs)
    }
    return jobs.map(job => job.queue)
  }

  runAsWorker<T>(fn: () => T | Promise<T>): Promise<T> {
    return detached(() => platformScope.run(this.platform, () => clockScope.run(this.clock, () => workerScope.run(true, async () => fn()))))
  }

  start(): void {
    platformScope.run(this.platform, () => {
      if (!this.loop.running) {
        this.epoch++
        this.loop.start()
      }
    })
  }

  stop(deadlineMs = STOP_TIMEOUT_MS): Promise<void> {
    return platformScope.run(this.platform, () => this.stopWithin(deadlineMs))
  }

  private async stopWithin(deadlineMs: number): Promise<void> {
    const epoch = this.epoch
    const stopped = (async () => {
      await this.loop.stop()
      await Promise.all(this.runsOf(epoch))
    })()
    if (await settlesWithin(stopped, deadlineMs)) {
      return
    }
    for (const [controller, started] of this.running) {
      if (started === epoch) {
        controller.abort(new WorkerStopped())
      }
    }
    if (await settlesWithin(stopped, ABORTED_GRACE_MS)) {
      return
    }
    const jobs = this.runsOf(epoch).length
    log.warn(`[Worker] ${jobs} job(s) still run after the stop's deadline: their lease will run out, and another worker take them`, { jobs })
  }

  private runsOf(epoch: number): Promise<void>[] {
    return [...this.inFlight].filter(([, started]) => started === epoch).map(([run]) => run)
  }

  wake(): void {
    this.loop.wake()
  }

  idle(): Promise<void> {
    return platformScope.run(this.platform, async () => {
      do {
        await Promise.all([...this.inFlight.keys(), ...this.claiming.keys()])
      }
      while (await this.drain(false) > 0 || this.inFlight.size > 0 || this.claiming.size > 0)
    })
  }

  private async look(): Promise<void> {
    await this.seen()
    await this.warnAboutOrphans()
    await this.purge()
    await this.drain(true)
  }

  private async drain(looking: boolean): Promise<number> {
    const epoch = this.epoch
    let started = 0
    for (;;) {
      if (looking && (!this.loop.running || epoch !== this.epoch)) {
        return started
      }
      const room = this.options.concurrency - this.inFlight.size - this.taken()
      if (room <= 0) {
        return started
      }
      const claim = this.claim(room)
      const settled = claim.then(() => {}, () => {})
      this.claiming.set(settled, room)
      let claimed: Job[]
      try {
        claimed = await claim
      } finally {
        this.claiming.delete(settled)
      }
      if (claimed.length === 0) {
        return started
      }
      for (const each of claimed) {
        this.track(each, epoch)
      }
      started += claimed.length
    }
  }

  private taken(): number {
    let places = 0
    for (const room of this.claiming.values()) {
      places += room
    }
    return places
  }

  private track(claimed: Job, epoch: number): void {
    const run: Promise<void> = this.process(claimed, epoch)
      .catch(error => log.error(`[Worker] job ${claimed.id} could not be closed, its lease will run out`, { jobId: claimed.id, queue: claimed.queue, error }))
      .finally(() => {
        this.inFlight.delete(run)
        this.wake()
      })
    this.inFlight.set(run, epoch)
  }

  private claim(limit: number): Promise<Job[]> {
    const queues = [...this.registrations.keys()]
    if (queues.length === 0) {
      return Promise.resolve([])
    }
    const lockedBy = `${this.id}/${++this.claims}`
    return this.useCaseRunner.run('job.claim', () => this.outbox.claim(queues, limit, lockedBy, this.later(this.options.leaseMs), this.later(0)))
  }

  private async process(claimed: Job, epoch: number): Promise<void> {
    const waitMs = Math.max(0, this.clock.now().getTime() - Date.parse(claimed.runAfter))
    const told = (kind: JobFlow['kind']) => {
      for (const listener of this.flows) {
        try {
          listener({ queue: claimed.queue, kind, waitMs })
        } catch (error) {
          log.error(`[Worker] a job of ${claimed.queue} closed ${kind} could not be counted`, { queue: claimed.queue, kind, error })
        }
      }
    }
    const registration = this.registrations.get(claimed.queue)
    if (!registration) {
      await this.close(claimed, { status: 'pending', lastError: claimed.lastError, runAfter: this.later(this.options.pollMs), giveBack: true })
      return
    }
    if (claimed.attempts > registration.attempts) {
      if (await this.close(claimed, { status: 'dead', lastError: claimed.lastError ?? 'Its worker stopped before it finished, on every attempt' })) {
        told('dead')
      }
      return
    }

    const controller = new AbortController()
    const lease = this.keepLease(claimed, controller)
    this.running.set(controller, epoch)
    try {
      const event = JSON.parse(claimed.event) as PublishedEvent
      await this.react(registration.handler, event, claimed.queue, controller.signal)
      lease.end()
      if (await this.close(claimed, { status: 'done', lastError: null })) {
        told('delivered')
      } else {
        warnLost(claimed)
      }
    } catch (error) {
      lease.end()
      const { reason } = controller.signal
      if (reason instanceof WorkerStopped && (error === reason || (error as { name?: unknown } | null)?.name === 'AbortError')) {
        if (!await this.close(claimed, { status: 'pending', lastError: claimed.lastError, runAfter: this.later(0), giveBack: true })) {
          warnLost(claimed)
        }
        return
      }
      const lastError = error instanceof Error ? error.stack ?? error.message : String(error)
      const dead = claimed.attempts >= registration.attempts
      const closed = await (dead
        ? this.close(claimed, { status: 'dead', lastError })
        : this.close(claimed, { status: 'pending', lastError, runAfter: this.later(this.backoff(claimed.attempts)) }))
      if (closed) {
        told(dead ? 'dead' : 'redelivered')
      } else {
        warnLost(claimed)
      }
    } finally {
      lease.end()
      this.running.delete(controller)
    }
  }

  private async react(handler: EventHandler, event: PublishedEvent, queue: string, signal: AbortSignal): Promise<void> {
    const reaction = { event: event.id, queue, received: false }
    try {
      await detached(() => platformScope.run(this.platform, () => clockScope.run(this.clock, () => workerScope.run(true, () => reactionScope.run(reaction, () => handler(event, signal))))))
    } catch (error) {
      if (!(error instanceof AlreadyReceived)) {
        throw error
      }
    }
  }

  private keepLease(claimed: Job, controller: AbortController): { end(): void } {
    let heldUntil = this.time() + this.options.leaseMs
    let ended = false
    const end = () => {
      ended = true
      clearInterval(heartbeat)
    }
    const lost = (why: string) => {
      if (!ended && !controller.signal.aborted) {
        controller.abort(new DOMException(`Job ${claimed.id} lost its lease: ${why}`, 'AbortError'))
      }
    }
    let renewing: number | undefined
    const renew = async () => {
      if (renewing !== undefined) {
        if (this.time() >= renewing) {
          lost('its renew did not answer before the lease it asked for ran out')
        }
        return
      }
      const renewedUntil = this.time() + this.options.leaseMs
      renewing = renewedUntil
      try {
        if (await this.renew(claimed, renewedUntil)) {
          heldUntil = renewedUntil
        } else {
          lost('another claim took it')
        }
      } catch (error) {
        log.error(`[Worker] renewing the lease of job ${claimed.id} failed`, { jobId: claimed.id, queue: claimed.queue, error })
        if (this.time() >= heldUntil) {
          lost('it ran out while it could not be renewed')
        }
      } finally {
        renewing = undefined
      }
    }
    const heartbeat = setInterval(() => void renew(), this.options.leaseMs / 3)
    controller.signal.addEventListener('abort', () => clearInterval(heartbeat), { once: true })
    return { end }
  }

  private renew(claimed: Job, until: number): Promise<boolean> {
    return this.useCaseRunner.run('job.renew', () => this.outbox.renew(claimed, new Date(until).toISOString(), this.later(0)))
  }

  private close(claimed: Job, closing: JobClosing): Promise<boolean> {
    return this.useCaseRunner.run('job.close', () => this.outbox.close(claimed, closing, this.later(0)))
  }

  async state(): Promise<QueueState[]> {
    const now = this.clock.now().toISOString()
    const alive = this.later(-5 * this.options.seenEveryMs)
    const [depths, queues] = await Promise.all([this.outbox.depth(now), this.outbox.queues()])
    const seen = new Map(queues.map(queue => [queue.name, queue.lastSeenAt]))
    const names = [...new Set([...queues.map(queue => queue.name), ...depths.map(depth => depth.queue)])].sort()
    return names.map(queue => {
      const depth = depths.find(each => each.queue === queue) ?? { ready: 0, retrying: 0, running: 0, dead: 0, oldestDueAt: null }
      const lastSeenAt = seen.get(queue) ?? null
      const toRun = depth.ready + depth.retrying + depth.running > 0
      return { queue, ready: depth.ready, retrying: depth.retrying, running: depth.running, dead: depth.dead, oldestDueAt: depth.oldestDueAt, lastSeenAt, orphan: toRun && !this.registrations.has(queue) && (lastSeenAt === null || lastSeenAt < alive) }
    })
  }

  async dead(after: string | undefined, limit: number): Promise<Page<DeadJob>> {
    const jobs = await this.outbox.list({ status: 'dead', after, limit: limit + 1 })
    const dead = jobs.map(job => ({
      id: job.id, queue: job.queue, event: eventNameOf(job.event), attempts: job.attempts, lastError: job.lastError, createdAt: job.createdAt, diedAt: job.updatedAt,
    }))
    return toPage(dead, { size: limit, cursor: job => job.id })
  }

  private async seen(): Promise<void> {
    if (this.time() - this.seenAt < this.options.seenEveryMs || this.registrations.size === 0) {
      return
    }
    this.seenAt = this.time()
    await this.useCaseRunner.run('job.seen', () => this.outbox.seen([...this.registrations].map(([name, { pattern, attempts }]) => ({ name, event: pattern, attempts })), this.later(0)))
  }

  private async warnAboutOrphans(): Promise<void> {
    if (this.time() - this.orphansCheckedAt < this.options.orphansCheckEveryMs) {
      return
    }
    this.orphansCheckedAt = this.time()
    const alive = this.later(-5 * this.options.seenEveryMs)
    const seen = new Map((await this.outbox.queues()).map(queue => [queue.name, queue.lastSeenAt]))
    const orphans = (await this.outbox.waiting())
      .filter(({ queue }) => !this.registrations.has(queue) && (seen.get(queue) ?? '') <= alive)
    for (const queue of this.orphansWarned) {
      if (!orphans.some(orphan => orphan.queue === queue)) {
        this.orphansWarned.delete(queue)
      }
    }
    for (const { queue, jobs } of orphans) {
      if (this.orphansWarned.has(queue)) {
        continue
      }
      this.orphansWarned.add(queue)
      log.warn(`[Worker] ${jobs} job(s) of '${queue}' wait, and no worker serves that queue: was its handler renamed or removed?`, { queue, jobs })
    }
  }

  private async purge(): Promise<void> {
    if (this.time() - this.purgedAt < PURGE_EVERY_MS) {
      return
    }
    this.purgedAt = this.time()
    const before = this.later(-this.options.keepDoneMs)
    await this.useCaseRunner.run('job.purge', () => this.outbox.purge(before))
    const { inbox } = this.useCaseRunner
    if (inbox) {
      await this.useCaseRunner.run('inbox.purge', () => inbox.purge(before))
    }
  }

  private backoff(attempts: number): number {
    return Math.min(this.options.backoffMs * 2 ** (attempts - 1), this.options.maxBackoffMs)
  }

  private time(): number {
    return this.clock.now().getTime()
  }

  private later(ms: number): string {
    return new Date(this.time() + ms).toISOString()
  }

}
