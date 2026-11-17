import type { Job }    from '../../../../application/database/outbox/job'
import { compareText } from '../compare-text/compare-text'

export const byCreation = (a: Job, b: Job) => compareText(a.createdAt, b.createdAt) || compareText(a.id, b.id)
