import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import type { Job }   from '../../../../application/database/outbox/job'
import { byCreation } from './by-creation'

const job = (id: string, createdAt: string) => ({ id, createdAt }) as Job

describe('byCreation', () => {
  test('puts the job created first before the one created later', () => {
    expect(byCreation(job('b', '2026-01-01T00:00:00.000Z'), job('a', '2026-01-02T00:00:00.000Z'))).toBe(-1)
    expect(byCreation(job('a', '2026-01-02T00:00:00.000Z'), job('b', '2026-01-01T00:00:00.000Z'))).toBe(1)
  })

  // -----

  test('breaks a tie in creation by the id, and gives zero for the same job', () => {
    expect(byCreation(job('a', '2026-01-01T00:00:00.000Z'), job('b', '2026-01-01T00:00:00.000Z'))).toBe(-1)
    expect(byCreation(job('b', '2026-01-01T00:00:00.000Z'), job('a', '2026-01-01T00:00:00.000Z'))).toBe(1)
    expect(byCreation(job('a', '2026-01-01T00:00:00.000Z'), job('a', '2026-01-01T00:00:00.000Z'))).toBe(0)
  })
})
