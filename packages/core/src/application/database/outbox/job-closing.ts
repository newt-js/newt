import { Job } from './job'

export type JobClosing = Pick<Job, 'lastError'> & { status: 'pending' | 'done' | 'dead', runAfter?: string | undefined, giveBack?: boolean | undefined }
