import { afterEach }       from 'bun:test'
import { beforeEach }      from 'bun:test'
import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { ReactionRun }     from '../../../../domain/use-case/reaction-run'
import { uuidV7 }          from '../../../../domain/value-objects/uuid/uuid-v7/uuid-v7'
import { pause }           from '../../../testing/pause/pause'
import { TestClock }       from '../../../testing/test-clock/test-clock'
import { Database }        from '../../database'
import { DatabaseInbox }   from '../../inbox/database-inbox/database-inbox'
import { DatabaseFixture } from '../database-fixture'

export function describeInboxContract(name: string, fixture: DatabaseFixture): void {
  describe(`${name} keeps the Inbox contract`, () => {
    let database: Database
    let clock: TestClock
    let inbox: DatabaseInbox

    beforeEach(async () => {
      database = await fixture.open()
      clock = new TestClock('2026-01-01T00:00:00.000Z')
      inbox = new DatabaseInbox(database, clock)
    })

    afterEach(() => fixture.close?.(database))

    const event = uuidV7()
    const reaction = (queue = 'billing.invoice.on.order.placed', id = event): ReactionRun => ({ event: id, queue, received: false })

    test('receives a reaction once: a later transaction finds it there already', async () => {
      const first = reaction()
      const again = reaction()

      expect(await inbox.has(first)).toBe(false)
      expect(await database.run(() => inbox.receive(first))).toBe(true)
      expect(await database.run(() => inbox.receive(again))).toBe(false)

      expect(first.received).toBe(true)
      expect(await inbox.has(reaction())).toBe(true)
    })

    test('tells apart the queues that react to one event, and the events one queue reacts to', async () => {
      await database.run(() => inbox.receive(reaction()))

      expect(await database.run(() => inbox.receive(reaction('audit.record.on.order.placed')))).toBe(true)
      expect(await database.run(() => inbox.receive(reaction(undefined, uuidV7())))).toBe(true)
    })

    test('keeps nothing of a transaction that rolls back, and the reaction is to receive again', async () => {
      const first = reaction()

      await expect(database.run(async () => {
        await inbox.receive(first)
        throw new Error('boom')
      })).rejects.toThrow('boom')

      expect(first.received).toBe(false)
      expect(await inbox.has(first)).toBe(false)
      expect(await database.run(() => inbox.receive(first))).toBe(true)
    })

    test('a reaction found there already leaves its transaction to go on and commit', async () => {
      await database.run(() => inbox.receive(reaction()))

      const other = reaction('audit.record.on.order.placed')
      await database.run(async () => {
        expect(await inbox.receive(reaction())).toBe(false)
        expect(await inbox.receive(other)).toBe(true)
      })

      expect(await inbox.has(other)).toBe(true)
    })

    test('of two transactions receiving one reaction at once, one only receives it', async () => {
      const receiving = () => database.run(async () => {
        const received = await inbox.receive(reaction())
        await pause(20)
        return received
      })

      const received = await Promise.all([receiving(), receiving()])

      expect(received.sort()).toEqual([false, true])
    })

    test('purges what it received before a time, and keeps the rest', async () => {
      const old = reaction('audit.record.on.order.placed')
      await database.run(() => inbox.receive(old))
      clock.advance(60_000)
      await database.run(() => inbox.receive(reaction()))

      await inbox.purge('2026-01-01T00:00:30.000Z')

      expect(await inbox.has(old)).toBe(false)
      expect(await inbox.has(reaction())).toBe(true)
    })
  })
}
