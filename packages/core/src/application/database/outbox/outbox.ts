import { Job }                  from './job'
import { JobClosing }           from './job-closing'
import { JobQuery }             from './job-query'
import { JobQueueRegistration } from './job-queue-registration'
import { QueueDepth }           from './queue-depth'

export interface Outbox {
  add(jobs: Job[]): Promise<void>
  claim(queues: string[], limit: number, worker: string, leaseUntil: string, now: string): Promise<Job[]>
  renew(claimed: Job, leaseUntil: string, now: string): Promise<boolean>
  close(claimed: Job, closing: JobClosing, now: string): Promise<boolean>
  retry(id: string, now: string): Promise<boolean>
  seen(queues: JobQueueRegistration[], now: string): Promise<void>
  purge(before: string): Promise<void>
  list(query?: JobQuery): Promise<Job[]>
  get(id: string): Promise<Job | undefined>
  waiting(): Promise<{ queue: string, jobs: number }[]>
  depth(now: string): Promise<QueueDepth[]>
  queues(): Promise<(JobQueueRegistration & { lastSeenAt: string })[]>
}
