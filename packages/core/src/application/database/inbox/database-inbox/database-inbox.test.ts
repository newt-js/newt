import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
// --------------------------------------------------------
import { MemoryDatabase } from '../../../../adapters/database/memory/memory-database/memory-database'
import { TestClock }      from '../../../testing/test-clock/test-clock'
import type { InboxRow }  from '../inbox-row'
import { DatabaseInbox }  from './database-inbox'

describe('DatabaseInbox', () => {
  test('keeps each reaction in newt_inbox, by its event and queue, stamped by its clock', async () => {
    const database = new MemoryDatabase()
    const inbox = new DatabaseInbox(database, new TestClock('2026-03-01T10:00:00.000Z'))

    await database.run(() => inbox.receive({ event: 'e1', queue: 'billing[invoice].invoice_on_order.placed', received: false }))

    expect(await database.records<InboxRow>('newt_inbox').find()).toEqual([
      { id: 'e1:billing[invoice].invoice_on_order.placed', version: 1, receivedAt: '2026-03-01T10:00:00.000Z' },
    ])
  })

  test('marks the reaction received as soon as it writes it, so the saves after it in the same run write it no more', async () => {
    const database = new MemoryDatabase()
    const inbox = new DatabaseInbox(database, new TestClock())
    const reaction = { event: 'e1', queue: 'billing[invoice].invoice_on_order.placed', received: false }

    await database.run(async () => {
      const receiving = inbox.receive(reaction)
      expect(reaction.received).toBe(true)
      await receiving
    })

    expect(reaction.received).toBe(true)
  })
})
