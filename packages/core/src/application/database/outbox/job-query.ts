import type { Job } from './job'

export type JobQuery = {
  status?: Job['status'] | undefined
  after?: string | undefined
  limit?: number | undefined
}
