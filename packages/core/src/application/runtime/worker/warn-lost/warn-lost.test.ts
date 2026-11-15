import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { Job }      from '../../../database/outbox/job'
import { linesOf }  from '../../../platform/capture-lines/capture-lines'
import { warnLost } from './warn-lost'

describe('warnLost', () => {
  test('warns that a job ended after its worker lost its lease, with its id and queue', async () => {
    const job = { id: 'j-1', queue: 'invoice.open.on.order.placed' } as Job

    const lines = await linesOf(() => warnLost(job))

    expect(lines).toEqual([expect.objectContaining({
      level: 'warn',
      message: '[Worker] job j-1 ended after its worker lost its lease: another may have run it too',
      fields: { jobId: 'j-1', queue: 'invoice.open.on.order.placed' },
    })])
  })
})
