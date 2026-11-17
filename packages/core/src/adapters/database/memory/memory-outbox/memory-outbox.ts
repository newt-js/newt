import type { Job }                  from '../../../../application/database/outbox/job'
import type { JobClosing }           from '../../../../application/database/outbox/job-closing'
import type { JobQuery }             from '../../../../application/database/outbox/job-query'
import type { JobQueueRegistration } from '../../../../application/database/outbox/job-queue-registration'
import type { Outbox }               from '../../../../application/database/outbox/outbox'
import type { QueueDepth }           from '../../../../application/database/outbox/queue-depth'
import { byCreation }                from '../by-creation/by-creation'
import { MemoryTransactions }        from '../memory-transactions/memory-transactions'

type SeenQueue = JobQueueRegistration & { lastSeenAt: string }

export class MemoryOutbox implements Outbox {

  protected readonly jobs = new Map<string, Job>()
  private readonly seenQueues = new Map<string, SeenQueue>()

  constructor(private readonly transactions: MemoryTransactions) {}

  add(jobs: Job[]): Promise<void> {
    return this.transactions.run(() => {
      for (const job of jobs) {
        this.set({ ...job })
      }
    })
  }

  claim(queues: string[], limit: number, worker: string, leaseUntil: string, now: string): Promise<Job[]> {
    return this.transactions.run(() => {
      const claimable = [...this.view().values()]
        .filter(job => queues.includes(job.queue) && ((job.status === 'pending' && job.runAfter <= now) || (job.status === 'running' && job.lockedUntil !== null && job.lockedUntil < now)))
        .sort((a, b) => (a.runAfter < b.runAfter ? -1 : a.runAfter > b.runAfter ? 1 : 0))
        .slice(0, Math.floor(limit))
      return claimable.map(job => {
        const claimed: Job = { ...job, status: 'running', lockedBy: worker, lockedUntil: leaseUntil, attempts: job.attempts + 1, updatedAt: now }
        this.set(claimed)
        return { ...claimed }
      })
    })
  }

  renew(claimed: Job, leaseUntil: string, now: string): Promise<boolean> {
    return this.onClaim(claimed, { lockedUntil: leaseUntil }, now)
  }

  close(claimed: Job, closing: JobClosing, now: string): Promise<boolean> {
    return this.onClaim(claimed, {
      status: closing.status,
      lastError: closing.lastError,
      lockedBy: null,
      lockedUntil: null,
      ...(closing.runAfter ? { runAfter: closing.runAfter } : {}),
      ...(closing.giveBack ? { attempts: claimed.attempts - 1 } : {}),
    }, now)
  }

  retry(id: string, now: string): Promise<boolean> {
    return this.transactions.run(() => {
      const job = this.view().get(id)
      if (job?.status !== 'dead') {
        return false
      }
      this.set({ ...job, status: 'pending', attempts: 0, runAfter: now, lockedBy: null, lockedUntil: null, updatedAt: now })
      return true
    })
  }

  async seen(queues: JobQueueRegistration[], now: string): Promise<void> {
    this.transactions.assertNotEnded()
    for (const queue of queues) {
      this.seenQueues.set(queue.name, { ...queue, lastSeenAt: now })
    }
  }

  purge(before: string): Promise<void> {
    return this.transactions.run(() => {
      for (const job of [...this.view().values()]) {
        if (job.status === 'done' && job.updatedAt < before) {
          this.set(job, true)
        }
      }
    })
  }

  async list({ status, after, limit }: JobQuery = {}): Promise<Job[]> {
    this.transactions.assertNotEnded()
    const jobs = this.view()
    const sorted = [...jobs.values()].filter(job => status === undefined || job.status === status).sort(byCreation)
    const from = after === undefined ? undefined : jobs.get(after)
    if (after !== undefined && !from) {
      return []
    }
    const rest = from ? sorted.filter(job => byCreation(job, from) > 0) : sorted
    return rest.slice(0, limit).map(job => ({ ...job }))
  }

  async get(id: string): Promise<Job | undefined> {
    this.transactions.assertNotEnded()
    const job = this.view().get(id)
    return job ? { ...job } : undefined
  }

  async waiting(): Promise<{ queue: string, jobs: number }[]> {
    this.transactions.assertNotEnded()
    const counts = new Map<string, number>()
    for (const job of this.view().values()) {
      if (job.status === 'pending' || job.status === 'running') {
        counts.set(job.queue, (counts.get(job.queue) ?? 0) + 1)
      }
    }
    return [...counts].sort(([a], [b]) => (a < b ? -1 : 1)).map(([queue, jobs]) => ({ queue, jobs }))
  }

  async depth(now: string): Promise<QueueDepth[]> {
    this.transactions.assertNotEnded()
    const depths = new Map<string, QueueDepth>()
    for (const job of this.view().values()) {
      if (job.status === 'done') {
        continue
      }
      const depth = depths.get(job.queue) ?? { queue: job.queue, ready: 0, retrying: 0, running: 0, dead: 0, oldestDueAt: null }
      if (job.status === 'pending') {
        depth[job.attempts === 0 ? 'ready' : 'retrying']++
        if (job.runAfter <= now && (depth.oldestDueAt === null || job.runAfter < depth.oldestDueAt)) {
          depth.oldestDueAt = job.runAfter
        }
      } else {
        depth[job.status]++
      }
      depths.set(job.queue, depth)
    }
    return [...depths.values()].sort((a, b) => (a.queue < b.queue ? -1 : 1))
  }

  async queues(): Promise<SeenQueue[]> {
    this.transactions.assertNotEnded()
    return [...this.seenQueues.values()].sort((a, b) => (a.name < b.name ? -1 : 1)).map(queue => ({ ...queue }))
  }

  private onClaim(claimed: Job, changes: Partial<Job>, now: string): Promise<boolean> {
    return this.transactions.run(() => {
      const held = this.view().get(claimed.id)
      if (held?.status !== 'running' || held.lockedBy !== claimed.lockedBy || held.attempts !== claimed.attempts) {
        return false
      }
      this.set({ ...held, ...changes, updatedAt: now })
      return true
    })
  }

  private view(): Map<string, Job> {
    const changes = this.changes()
    if (!changes?.size) {
      return this.jobs
    }
    const jobs = new Map(this.jobs)
    for (const [id, job] of changes) {
      if (job) {
        jobs.set(id, job)
      } else {
        jobs.delete(id)
      }
    }
    return jobs
  }

  private changes(): Map<string, Job | undefined> | undefined {
    return this.transactions.staged(this, () => {
      const changes = new Map<string, Job | undefined>()
      return {
        changes,
        apply: () => {
          for (const [id, job] of changes) {
            if (job) {
              this.jobs.set(id, job)
            } else {
              this.jobs.delete(id)
            }
          }
        },
      }
    })?.changes
  }

  private set(job: Job, remove = false): void {
    this.changes()!.set(job.id, remove ? undefined : job)
  }
}
