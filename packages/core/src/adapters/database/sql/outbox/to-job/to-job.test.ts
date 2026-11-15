import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { toJob }    from './to-job'

describe('toJob', () => {
  test('reads a row of newt_job as a job', () => {
    const row = { id: 'j1', queue: 'mail', event: '{"a":1}', status: 'running', attempts: 2, run_after: 'r', locked_by: 'w1', locked_until: 'u', last_error: 'e', created_at: 'c', updated_at: 'd' }

    expect(toJob(row)).toEqual({ id: 'j1', queue: 'mail', event: '{"a":1}', status: 'running', attempts: 2, runAfter: 'r', lockedBy: 'w1', lockedUntil: 'u', lastError: 'e', createdAt: 'c', updatedAt: 'd' })
  })

  // -----

  test('a driver that gives numbers as text, or nothing for an empty column, still gives a whole job', () => {
    const row = { id: 7, queue: 'mail', event: 'x', status: 'pending', attempts: '3', run_after: 'r', created_at: 'c', updated_at: 'd' }

    const job = toJob(row)

    expect(job.id).toBe('7')
    expect(job.attempts).toBe(3)
    expect([job.lockedBy, job.lockedUntil, job.lastError]).toEqual([null, null, null])
  })
})
