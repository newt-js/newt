import type { Job }                  from '../../../../../application/database/outbox/job'
import type { JobClosing }           from '../../../../../application/database/outbox/job-closing'
import type { JobQuery }             from '../../../../../application/database/outbox/job-query'
import type { JobQueueRegistration } from '../../../../../application/database/outbox/job-queue-registration'
import type { Outbox }               from '../../../../../application/database/outbox/outbox'
import type { QueueDepth }           from '../../../../../application/database/outbox/queue-depth'
import type { SqlDialect }           from '../../dialect/sql-dialect'
import type { SqlRun }               from '../../dialect/sql-run'
import { toJob }                     from '../to-job/to-job'

export const JOB_COLUMNS = ['id', 'queue', 'event', 'status', 'attempts', 'run_after', 'locked_by', 'locked_until', 'last_error', 'created_at', 'updated_at']

export type InTransaction = <T>(fn: (run: SqlRun) => Promise<T>) => Promise<T>

export class SqlOutbox implements Outbox {

  constructor(
    private readonly dialect: SqlDialect,
    private readonly transaction: InTransaction,
    private readonly read: SqlRun,
  ) {}

  add(jobs: Job[]): Promise<void> {
    return this.transaction(async run => {
      const placeholders = JOB_COLUMNS.map((_, i) => this.p(i + 1)).join(', ')
      for (const job of jobs) {
        await run(`INSERT INTO newt_job (${JOB_COLUMNS.join(', ')}) VALUES (${placeholders})`, [job.id, job.queue, job.event, job.status, job.attempts, job.runAfter, job.lockedBy, job.lockedUntil, job.lastError, job.createdAt, job.updatedAt])
      }
    })
  }

  async claim(queues: string[], limit: number, worker: string, leaseUntil: string, now: string): Promise<Job[]> {
    if (queues.length === 0 || limit < 1) {
      return []
    }
    return this.transaction(async run => (await this.dialect.claim(run, queues, Math.floor(limit), worker, leaseUntil, now)).map(toJob))
  }

  renew(claimed: Job, leaseUntil: string, now: string): Promise<boolean> {
    return this.onClaim(claimed, ['locked_until'], [leaseUntil], now)
  }

  close(claimed: Job, closing: JobClosing, now: string): Promise<boolean> {
    const columns = ['status', 'last_error', 'locked_by', 'locked_until']
    const values: unknown[] = [closing.status, closing.lastError, null, null]
    if (closing.runAfter) {
      columns.push('run_after')
      values.push(closing.runAfter)
    }
    if (closing.giveBack) {
      columns.push('attempts')
      values.push(claimed.attempts - 1)
    }
    return this.onClaim(claimed, columns, values, now)
  }

  retry(id: string, now: string): Promise<boolean> {
    return this.transaction(async run => {
      const [dead] = await run(`SELECT id FROM newt_job WHERE id = ${this.p(1)} AND status = 'dead'${this.dialect.forUpdate}`, [id])
      if (!dead) {
        return false
      }
      await run(`UPDATE newt_job SET status = 'pending', attempts = 0, run_after = ${this.p(1)}, locked_by = NULL, locked_until = NULL, updated_at = ${this.p(2)} WHERE id = ${this.p(3)} AND status = 'dead'`, [now, now, id])
      return true
    })
  }

  seen(queues: JobQueueRegistration[], now: string): Promise<void> {
    return this.transaction(async run => {
      for (const queue of queues) {
        await run(this.dialect.upsertQueue, [queue.name, queue.event, queue.attempts, now, now])
      }
    })
  }

  purge(before: string): Promise<void> {
    return this.transaction(async run => {
      await run(`DELETE FROM newt_job WHERE status = 'done' AND updated_at < ${this.p(1)}`, [before])
    })
  }

  async list({ status, after, limit }: JobQuery = {}): Promise<Job[]> {
    const params: unknown[] = []
    const param = (value: unknown) => this.p(params.push(value))
    if (after !== undefined) {
      const [from] = await this.read(`SELECT created_at, id FROM newt_job WHERE id = ${this.p(1)}`, [after])
      if (!from) {
        return []
      }
      const where = [
        ...(status === undefined ? [] : [`status = ${param(status)}`]),
        `(created_at > ${param(from.created_at)} OR (created_at = ${param(from.created_at)} AND id > ${param(from.id)}))`,
      ]
      return this.listed(where, params, limit)
    }
    return this.listed(status === undefined ? [] : [`status = ${param(status)}`], params, limit)
  }

  async get(id: string): Promise<Job | undefined> {
    const [row] = await this.read(`SELECT ${JOB_COLUMNS.join(', ')} FROM newt_job WHERE id = ${this.p(1)}`, [id])
    return row ? toJob(row) : undefined
  }

  async waiting(): Promise<{ queue: string, jobs: number }[]> {
    const rows = await this.read(`SELECT queue, COUNT(*) AS jobs FROM newt_job WHERE status IN ('pending', 'running') GROUP BY queue ORDER BY queue`, [])
    return rows.map(row => ({ queue: String(row.queue), jobs: Number(row.jobs) }))
  }

  async depth(now: string): Promise<QueueDepth[]> {
    const due = this.dialect.quote('oldestDueAt')
    const rows = await this.read(`
      SELECT queue,
             SUM(CASE WHEN status = 'pending' AND attempts = 0 THEN 1 ELSE 0 END) AS ready,
             SUM(CASE WHEN status = 'pending' AND attempts > 0 THEN 1 ELSE 0 END) AS retrying,
             SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) AS running,
             SUM(CASE WHEN status = 'dead' THEN 1 ELSE 0 END) AS dead,
             MIN(CASE WHEN status = 'pending' AND run_after <= ${this.p(1)} THEN run_after END) AS ${due}
      FROM newt_job WHERE status IN ('pending', 'running', 'dead')
      GROUP BY queue ORDER BY queue`, [now])
    return rows.map(row => ({
      queue: String(row.queue),
      ready: Number(row.ready),
      retrying: Number(row.retrying),
      running: Number(row.running),
      dead: Number(row.dead),
      oldestDueAt: row.oldestDueAt === null || row.oldestDueAt === undefined ? null : String(row.oldestDueAt),
    }))
  }

  async queues(): Promise<(JobQueueRegistration & { lastSeenAt: string })[]> {
    const rows = await this.read('SELECT name, event, attempts, last_seen_at FROM newt_job_queue ORDER BY name', [])
    return rows.map(row => ({ name: String(row.name), event: String(row.event), attempts: Number(row.attempts), lastSeenAt: String(row.last_seen_at) }))
  }

  private async listed(where: string[], params: unknown[], limit: number | undefined): Promise<Job[]> {
    const filter = where.length > 0 ? ` WHERE ${where.join(' AND ')}` : ''
    const page = limit === undefined ? '' : ` LIMIT ${Math.floor(limit)}`
    return (await this.read(`SELECT ${JOB_COLUMNS.join(', ')} FROM newt_job${filter} ORDER BY created_at, id${page}`, params)).map(toJob)
  }

  private onClaim(claimed: Job, columns: string[], values: unknown[], now: string): Promise<boolean> {
    const sets = [...columns, 'updated_at'].map((column, i) => `${column} = ${this.p(i + 1)}`).join(', ')
    const n = columns.length + 1
    return this.transaction(async run => {
      const [held] = await run(`SELECT id FROM newt_job WHERE id = ${this.p(1)} AND status = 'running' AND locked_by = ${this.p(2)} AND attempts = ${this.p(3)}${this.dialect.forUpdate}`, [claimed.id, claimed.lockedBy, claimed.attempts])
      if (!held) {
        return false
      }
      await run(`UPDATE newt_job SET ${sets} WHERE id = ${this.p(n + 1)} AND status = 'running' AND locked_by = ${this.p(n + 2)} AND attempts = ${this.p(n + 3)}`, [...values, now, claimed.id, claimed.lockedBy, claimed.attempts])
      return true
    })
  }

  private p(n: number): string {
    return this.dialect.param(n)
  }
}
