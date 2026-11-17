import type { Job }    from '../../../../../application/database/outbox/job'
import type { SqlRow } from '../../dialect/sql-run'

export function toJob(row: SqlRow): Job {
  return {
    id: String(row.id),
    queue: String(row.queue),
    event: String(row.event),
    status: row.status as Job['status'],
    attempts: Number(row.attempts),
    runAfter: String(row.run_after),
    lockedBy: (row.locked_by as string | null) ?? null,
    lockedUntil: (row.locked_until as string | null) ?? null,
    lastError: (row.last_error as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}
