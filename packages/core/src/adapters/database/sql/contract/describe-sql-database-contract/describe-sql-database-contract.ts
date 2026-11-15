import { afterEach }           from 'bun:test'
import { beforeEach }          from 'bun:test'
import { describe }            from 'bun:test'
import { expect }              from 'bun:test'
import { test }                from 'bun:test'
import { mkdtemp }             from 'node:fs/promises'
import { rm }                  from 'node:fs/promises'
import { tmpdir }              from 'node:os'
import { join }                from 'node:path'
// --------------------------------------------------------
import { ContextBase }         from '../../../../../application/context/context-base/context-base'
import { Platform }            from '../../../../../application/platform/platform/platform'
import { ConcurrencyConflict } from '../../../../../domain/errors/concurrency-conflict/concurrency-conflict'
import { DuplicateValue }      from '../../../../../domain/errors/duplicate-value/duplicate-value'
import { StaleVersion }        from '../../../../../domain/errors/stale-version/stale-version'
import { Records }             from '../../../../../domain/repository/records/records'
import { GuardTimeout }        from '../../../../../domain/repository/transactions/guard-timeout/guard-timeout'
import { TransactionSpoiled }  from '../../../../../domain/repository/transactions/transaction-spoiled/transaction-spoiled'
import { uuidV7 }              from '../../../../../domain/value-objects/uuid/uuid-v7/uuid-v7'
import { TransactionConflict } from '../../transactions/transaction-conflict/transaction-conflict'
import { item }                from '../item/item'
import { pause }               from '../pause/pause'
import { quietCluster }        from '../quiet-cluster/quiet-cluster'
import { ItemRow }             from '../sql-database-fixture'
import { SqlDatabaseFixture }  from '../sql-database-fixture'
import { SqlDatabaseWorld }    from '../sql-database-fixture'

const NOTE_TABLE = 'CREATE TABLE note (n INTEGER NOT NULL)'

export function describeSqlDatabaseContract(name: string, fixture: SqlDatabaseFixture): void {
  describe(`${name} keeps what a SQL database promises`, () => {
    let world: SqlDatabaseWorld
    let items: Records<ItemRow>

    beforeEach(async () => {
      world = await fixture.open()
      items = world.database.records<ItemRow>('item')
    })

    afterEach(() => fixture.close(world))

    test('gives back booleans, JSON and big numbers as they were kept', async () => {
      await items.insert(item('a', { active: false, data: { lines: [{ sku: 'x', qty: 2 }], note: 'ñandú' }, amount: 9_007_199_254_740_991 }))
      await items.insert(item('b', { data: ['one', 2, true, null] }))
      await items.insert(item('c', { data: 'just text' }))

      expect(await items.find()).toEqual([
        { id: 'a', version: 1, name: 'a', code: 'a', active: false, data: { lines: [{ sku: 'x', qty: 2 }], note: 'ñandú' }, amount: 9_007_199_254_740_991 },
        { id: 'b', version: 1, name: 'b', code: 'b', active: true, data: ['one', 2, true, null], amount: null },
        { id: 'c', version: 1, name: 'c', code: 'c', active: true, data: 'just text', amount: null },
      ])
      expect(await items.count({ active: false })).toBe(1)
    })

    test('gives back a whole number too big for a double as its exact digits', async () => {
      await items.insert(item('a', { amount: 9_223_372_036_854_775_807n as unknown as number }))

      expect((await items.find()).map(each => each.amount)).toEqual(['9223372036854775807' as unknown as number])
    })

    test('changes a JSON field and a boolean, and finds by them', async () => {
      await items.insert(item('a', { data: { n: 1 } }))

      await items.update('a', 1, { active: false, data: { n: 2 } })

      expect(await items.find({ active: false })).toEqual([{ id: 'a', version: 2, name: 'a', code: 'a', active: false, data: { n: 2 }, amount: null }])
    })

    test('puts null first going up and last going down, as memory does', async () => {
      await items.insert(item('a', { name: 'b' }))
      await items.insert(item('b', { name: null }))
      await items.insert(item('c', { name: 'a' }))

      expect((await items.find({}, { orderBy: [{ field: 'name' }] })).map(each => each.id)).toEqual(['b', 'c', 'a'])
      expect((await items.find({}, { orderBy: [{ field: 'name', direction: 'desc' }] })).map(each => each.id)).toEqual(['a', 'c', 'b'])
      expect(await items.countBy({}, ['name'])).toEqual([{ name: null, count: 1 }, { name: 'a', count: 1 }, { name: 'b', count: 1 }])
    })

    test('compares text by code point, case and accents apart, and ignores the case of A to Z only when told', async () => {
      await items.insert(item('a', { name: 'Ana' }))
      await items.insert(item('b', { name: 'ana' }))
      await items.insert(item('c', { name: 'ÁNA' }))
      await items.insert(item('d', { name: 'ána' }))

      expect((await items.find({ name: 'ana' })).map(each => each.id)).toEqual(['b'])
      expect((await items.find({ name: { ieq: 'ANA' } })).map(each => each.id)).toEqual(['a', 'b'])
      expect((await items.find({ name: { ieq: 'Ána' } })).map(each => each.id)).toEqual(['c'])
      expect((await items.find({}, { orderBy: [{ field: 'name' }] })).map(each => each.id)).toEqual(['a', 'b', 'c', 'd'])
      expect((await items.find({ name: { gt: 'ana' } })).map(each => each.id)).toEqual(['c', 'd'])
    })

    test('ignores the case of A to Z alone: no other letter folds into one of them', async () => {
      await items.insert(item('a', { name: 'k' }))
      await items.insert(item('b', { name: 'İi' }))
      await items.insert(item('c', { name: 'é' }))

      expect((await items.find({ name: { ieq: 'K' } })).map(each => each.id)).toEqual(['a'])
      expect((await items.find({ name: { ieq: '\u212A' } })).map(each => each.id)).toEqual([])
      expect((await items.find({ name: { ieq: 'iİ' } })).map(each => each.id)).toEqual([])
      expect((await items.find({ name: { ieq: 'É' } })).map(each => each.id)).toEqual([])
    })

    test('finds by lists, differences and ranges as memory does, null among them', async () => {
      await items.insert(item('a', { name: null, amount: 1 }))
      await items.insert(item('b', { name: 'x', amount: 2 }))
      await items.insert(item('c', { name: 'y', amount: null }))

      expect((await items.find({ name: { in: ['x', null] } })).map(each => each.id)).toEqual(['a', 'b'])
      expect((await items.find({ name: { ne: 'x' } })).map(each => each.id)).toEqual(['a', 'c'])
      expect((await items.find({ amount: { lt: 2 } })).map(each => each.id)).toEqual(['a'])
      expect((await items.find({ or: [{ amount: 2 }, { name: 'y' }] })).map(each => each.id)).toEqual(['b', 'c'])
    })

    test('a value taken by a unique index is a DuplicateValue that names its field', async () => {
      await items.insert(item('a', { code: 'same' }))

      const refused = await items.insert(item('b', { code: 'same' })).catch((error: unknown) => error)

      expect(refused).toBeInstanceOf(DuplicateValue)
      expect((refused as DuplicateValue).params.fields).toEqual(['code'])
      await expect(items.update('a', 1, { code: 'same' })).resolves.toBeUndefined()
    })

    test('a taken id, a named unique index and one on two columns each name the fields they are on', async () => {
      const pairs = world.database.records<{ id: string, version: number, tenant: string, code: string, email: string }>('pair')
      await items.insert(item('a'))
      await pairs.insert({ id: 'a', tenant: 't', code: 'c', email: 'e' })

      const fields = (writing: Promise<void>) => writing.then(() => null, (error: unknown) => (error as DuplicateValue).params.fields)

      expect(await fields(items.insert(item('a', { code: 'other' })))).toEqual(['id'])
      expect(await fields(pairs.insert({ id: 'b', tenant: 'u', code: 'd', email: 'e' }))).toEqual(['email'])
      expect(await fields(pairs.insert({ id: 'b', tenant: 't', code: 'c', email: 'f' }))).toEqual(['tenant', 'code'])
    })

    test('a write that fails inside a transaction fails alone: the rest of it still commits', async () => {
      await items.insert(item('a', { code: 'taken' }))

      await world.database.run(async () => {
        await items.insert(item('b'))
        await expect(items.insert(item('c', { code: 'taken' }))).rejects.toBeInstanceOf(DuplicateValue)
        await expect(items.update('a', 9, { name: 'x' })).rejects.toBeInstanceOf(StaleVersion)
        await items.insert(item('d'))
      })

      expect((await items.find()).map(each => each.id)).toEqual(['a', 'b', 'd'])
    })

    test('writes side by side in one transaction each run whole, and all commit together', async () => {
      await world.database.run(() => Promise.all(['a', 'b', 'c', 'd', 'e'].map(id => items.insert(item(id)))))

      expect(await items.count()).toBe(5)
    })

    test('a save joined to a transaction that fails spoils it, however caught', async () => {
      const spoiled = world.database.run(async () => {
        await items.insert(item('a'))
        await world.database.save(async () => {
          await items.insert(item('b'))
          throw new Error('half done')
        }).catch(() => {})
      })

      await expect(spoiled).rejects.toBeInstanceOf(TransactionSpoiled)
      expect(await items.count()).toBe(0)
    })

    test('runs afterCommit once it commits, never before nor on a rollback', async () => {
      const told: string[] = []

      await world.database.run(async () => {
        world.database.afterCommit(() => told.push('committed'))
        await items.insert(item('a'))
        told.push('inside')
      })
      await world.database.run(async () => {
        world.database.afterCommit(() => told.push('never'))
        throw new Error('rolls back')
      }).catch(() => {})

      expect(told).toEqual(['inside', 'committed'])
    })

    test('a call that comes after its transaction ended fails, instead of running outside it', async () => {
      let late: Promise<unknown> = Promise.resolve()

      await world.database.run(async () => {
        late = pause(30).then(() => items.insert(item('late')))
      })

      await expect(late).rejects.toThrow('belongs to a transaction that has ended')
      expect(await items.count()).toBe(0)
    })

    test('reads outside a transaction see only what is committed', async () => {
      let letGo = () => {}
      const held = new Promise<void>(resolve => {
        letGo = resolve
      })
      const writing = world.database.run(async () => {
        await items.insert(item('a'))
        await held
      })
      await pause()

      expect(await items.count()).toBe(0)
      letGo()
      await writing
      expect(await items.count()).toBe(1)
    })

    test('two databases on the same data take turns on a key one guards', async () => {
      const twin = await world.twin()
      try {
        const order: string[] = []
        let letGo = () => {}
        const held = new Promise<void>(resolve => {
          letGo = resolve
        })
        const first = world.database.run(async () => {
          await world.database.guard(['stock:p1'])
          order.push('first holds')
          await held
          order.push('first ends')
        })
        await pause(50)
        const second = twin.run(async () => {
          await twin.guard(['stock:p1'])
          order.push('second holds')
        })
        await pause(50)
        letGo()
        await Promise.all([first, second])

        expect(order).toEqual(['first holds', 'first ends', 'second holds'])
      } finally {
        await twin.close()
      }
    })

    test('a guard another database holds is waited for no longer than told', async () => {
      if (!fixture.concurrent) {
        return
      }
      const twin = await world.twin()
      try {
        let letGo = () => {}
        const held = new Promise<void>(resolve => {
          letGo = resolve
        })
        const first = world.database.run(async () => {
          await world.database.guard(['k'])
          await held
        })
        await pause(50)

        await expect(twin.run(() => twin.guard(['k'], { waitMs: 100 }))).rejects.toBeInstanceOf(GuardTimeout)
        letGo()
        await first
      } finally {
        await twin.close()
      }
    })

    test('a guard that times out leaves its transaction as it was: what comes after it commits', async () => {
      if (!fixture.concurrent) {
        return
      }
      const twin = await world.twin()
      try {
        let letGo = () => {}
        const held = new Promise<void>(resolve => {
          letGo = resolve
        })
        const first = twin.run(async () => {
          await twin.guard(['k'])
          await held
        })
        await pause(50)

        await world.database.run(async () => {
          await items.insert(item('a'))
          await expect(world.database.guard(['k'], { waitMs: 50 })).rejects.toBeInstanceOf(GuardTimeout)
          await items.insert(item('b'))
        })
        letGo()
        await first

        expect((await items.find()).map(each => each.id)).toEqual(['a', 'b'])
      } finally {
        await twin.close()
      }
    })

    test('a guard on several keys that times out lets go of the ones it took', async () => {
      if (!fixture.concurrent) {
        return
      }
      const holder = await world.twin()
      const third = await world.twin()
      try {
        let letGo = () => {}
        const held = new Promise<void>(resolve => {
          letGo = resolve
        })
        let carryOn = () => {}
        const timedOut = new Promise<void>(resolve => {
          carryOn = resolve
        })
        const holding = holder.run(async () => {
          await holder.guard(['k2'])
          await held
        })
        await pause(50)
        const failing = world.database.run(async () => {
          await expect(world.database.guard(['k1', 'k2'], { waitMs: 100 })).rejects.toBeInstanceOf(GuardTimeout)
          carryOn()
          await held
        })
        await timedOut

        const taking = third.run(() => third.guard(['k1'], { waitMs: 300 })).finally(letGo)
        await Promise.all([holding, failing])

        await expect(taking).resolves.toBeUndefined()
      } finally {
        await third.close()
        await holder.close()
      }
    })

    test('a transaction a deadlock rolled back keeps nothing of what comes after, however caught', async () => {
      if (!fixture.concurrent) {
        return
      }
      await items.insert(item('a'))
      await items.insert(item('b'))
      const done: Record<string, string[]> = { one: [], two: [] }
      let firstDone = () => {}
      const first = new Promise<void>(resolve => {
        firstDone = resolve
      })
      let secondDone = () => {}
      const second = new Promise<void>(resolve => {
        secondDone = resolve
      })
      const crossing = (who: 'one' | 'two', mine: string, theirs: string, wait: () => Promise<unknown>, ready: () => void) => world.database.run(async () => {
        await items.update(mine, 1, { name: who })
        done[who]!.push(mine)
        ready()
        await wait()
        await items.update(theirs, 1, { name: who }).then(() => done[who]!.push(theirs), () => {})
        await items.insert(item(`after-${who}`)).then(() => done[who]!.push(`after-${who}`), () => {})
      })

      const outcomes = await Promise.allSettled([
        crossing('one', 'a', 'b', () => second, firstDone),
        crossing('two', 'b', 'a', () => first.then(() => pause(100)), secondDone),
      ])

      const rows = await items.find()
      const kept = (who: string, id: string) => rows.some(row => row.id === id && (id.startsWith('after-') || row.name === who))
      outcomes.forEach((outcome, i) => {
        const who = i === 0 ? 'one' : 'two'
        if (outcome.status === 'rejected') {
          expect(outcome.reason).toBeInstanceOf(TransactionConflict)
          expect(done[who]!.filter(id => kept(who, id))).toEqual([])
        } else {
          expect(done[who]!.filter(id => kept(who, id))).toEqual(done[who]!)
        }
      })
    })

    test('claims of two databases on the same jobs never take the same one', async () => {
      const twin = await world.twin()
      try {
        const now = new Date().toISOString()
        const lease = new Date(Date.now() + 60_000).toISOString()
        const jobs = Array.from({ length: 20 }, () => ({ id: uuidV7(), queue: 'a.b.on.c', event: '{}', status: 'pending' as const, attempts: 0, runAfter: now, lockedBy: null, lockedUntil: null, lastError: null, createdAt: now, updatedAt: now }))
        await world.database.outbox.add(jobs)

        const claims = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => (i % 2 === 0 ? world.database : twin).outbox.claim(['a.b.on.c'], 3, `w${i}`, lease, now)))

        const refused = claims.flatMap(claim => (claim.status === 'rejected' ? [claim.reason] : []))
        const claimed = claims.flatMap(claim => (claim.status === 'fulfilled' ? claim.value : [])).map(job => job.id)
        refused.forEach(reason => expect(reason).toBeInstanceOf(ConcurrencyConflict))
        expect(new Set(claimed).size).toBe(claimed.length)
        expect(claimed.length).toBeGreaterThan(0)
      } finally {
        await twin.close()
      }
    })

    test('the engine runs on it: a job published in a transaction runs once it commits, and goes with it if it rolls back', async () => {
      const base = new ContextBase({ name: 'shop', platform: new Platform({ cluster: quietCluster() }), database: world.database })
      const mailed: unknown[] = []
      base.bus.subscribe('order.placed', event => void mailed.push(event.payload), { strategy: 'handler', queue: 'mail.send.on.order.placed' })

      await world.database.run(async () => {
        await items.insert(item('a'))
        await base.bus.publish({ name: 'order.placed', payload: { id: 'a' }, occurredAt: new Date().toISOString() })
      })
      await world.database.run(async () => {
        await base.bus.publish({ name: 'order.placed', payload: { id: 'never' }, occurredAt: new Date().toISOString() })
        throw new Error('rolls back')
      }).catch(() => {})
      await base.worker.idle()

      expect(mailed).toEqual([{ id: 'a' }])
      expect(await world.database.outbox.list({ status: 'done' })).toHaveLength(1)
      expect(await world.database.outbox.list()).toHaveLength(1)
    })

    test('a schedule tick is kept in its own table, by version', async () => {
      const ticks = world.database.records<{ id: string, version: number, dueAt: string }>('newt_schedule_tick')

      await ticks.insert({ id: 'report.daily', dueAt: '2026-01-01T03:00:00.000Z' })
      await ticks.update('report.daily', 1, { dueAt: '2026-01-02T03:00:00.000Z' })

      expect(await ticks.find()).toEqual([{ id: 'report.daily', version: 2, dueAt: '2026-01-02T03:00:00.000Z' }])
    })

    test('says what is applied, and applies nothing twice', async () => {
      expect(await world.database.migrations.status()).toEqual({ applied: ['00001_items'], pending: [], changed: [] })
      expect(await world.database.migrations.up()).toEqual([])
    })

    test('reverts the last migration, and applies it again', async () => {
      expect(await world.database.migrations.down()).toBe('00001_items')
      expect(await world.database.migrations.status()).toEqual({ applied: [], pending: ['00001_items'], changed: [] })
      expect(await world.database.migrations.up()).toEqual(['00001_items'])
      await items.insert(item('a'))
      expect(await items.count()).toBe(1)
    })

    test('a statement run outside a transaction may write: it commits on its own', async () => {
      await items.insert(item('a'))
      await items.insert(item('b'))

      await world.database.query("DELETE FROM item WHERE code = 'a'")

      expect((await items.find()).map(each => each.id)).toEqual(['b'])
    })

    describe('over migrations of its own', () => {
      let folder: string
      let own: SqlDatabaseWorld

      beforeEach(async () => {
        folder = await mkdtemp(join(tmpdir(), 'newt-migrations-'))
        await Bun.write(join(folder, '00001_notes_up.sql'), NOTE_TABLE)
        await Bun.write(join(folder, '00001_notes_down.sql'), 'DROP TABLE note')
        own = await fixture.open(folder)
      })

      afterEach(async () => {
        await fixture.close(own)
        await rm(folder, { recursive: true, force: true })
      })

      test('refuses to go on when an applied migration was changed since, naming it; status tells it', async () => {
        await Bun.write(join(folder, '00001_notes_up.sql'), `${NOTE_TABLE.slice(0, -1)}, m INTEGER)`)

        expect(await own.database.migrations.status()).toEqual({ applied: ['00001_notes'], pending: [], changed: ['00001_notes'] })
        await expect(own.database.migrations.up()).rejects.toThrow('Migration 00001_notes was changed after it was applied')
      })

      test('refuses when the last applied migration has no file, to go on or to revert it', async () => {
        await rm(join(folder, '00001_notes_up.sql'))
        await rm(join(folder, '00001_notes_down.sql'))

        await expect(own.database.migrations.up()).rejects.toThrow('Last applied migration 00001_notes is not in the migrations folder')
        await expect(own.database.migrations.down()).rejects.toThrow('Migration file for 00001_notes not found')
      })

      test('a migration that fails halfway keeps nothing of it, and is not remembered', async () => {
        await Bun.write(join(folder, '00002_half_down.sql'), 'DELETE FROM note')
        await Bun.write(join(folder, '00002_half_up.sql'), 'INSERT INTO note (n) VALUES (1);\nINSERT INTO missing (n) VALUES (1);')

        await expect(own.database.migrations.up()).rejects.toThrow()
        expect(await own.database.migrations.status()).toEqual({ applied: ['00001_notes'], pending: ['00002_half'], changed: [] })
        expect(await own.database.query('SELECT n FROM note')).toEqual([])

        await Bun.write(join(folder, '00002_half_up.sql'), 'INSERT INTO note (n) VALUES (1);')
        expect(await own.database.migrations.up()).toEqual(['00002_half'])
        expect(await own.database.query('SELECT n FROM note')).toEqual([{ n: 1 }])
      })
    })

    test('two databases that migrate at once take turns: the second finds it done', async () => {
      const twin = await world.twin()
      try {
        await world.database.migrations.down()

        const [one, two] = await Promise.all([world.database.migrations.up(), twin.migrations.up()])

        expect([...one, ...two]).toEqual(['00001_items'])
      } finally {
        await twin.close()
      }
    })
  })
}
