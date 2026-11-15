import { Job } from '../../../database/outbox/job'
import { log } from '../../../platform/log/log'

export function warnLost(claimed: Job): void {
  log.warn(`[Worker] job ${claimed.id} ended after its worker lost its lease: another may have run it too`, { jobId: claimed.id, queue: claimed.queue })
}
