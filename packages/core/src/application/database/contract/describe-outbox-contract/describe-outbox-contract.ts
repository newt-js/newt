import { afterEach }            from 'bun:test'
import { beforeEach }           from 'bun:test'
import { describe }             from 'bun:test'
import { expect }               from 'bun:test'
import { test }                 from 'bun:test'
// --------------------------------------------------------
import { ConcurrencyConflict }  from '../../../../domain/errors/concurrency-conflict/concurrency-conflict'
import { uuidV7 }               from '../../../../domain/value-objects/uuid/uuid-v7/uuid-v7'
import { pause }                from '../../../testing/pause/pause'
import type { Database }        from '../../database'
import type { DatabaseFixture } from '../database-fixture'

export function describeOutboxContract(name: string, fixture: DatabaseFixture): void {
  describe(`${name} keeps the Outbox contract`, () => {
    let database: Database

    beforeEach(async () => {
      database = await fixture.open()
    })

    afterEach(() => fixture.close?.(database))

    const lease = () => new Date(Date.now() + 60_000).toISOString()
    const at = (ms: number) => new Date(Date.now() + ms).toISOString()
    const job = (queue: string) => {
      const now = new Date().toISOString()
      return { id: uuidV7(), queue, event: '{}', status: 'pending' as const, attempts: 0, runAfter: now, lockedBy: null, lockedUntil: null, lastError: null, createdAt: now, updatedAt: now }
    }

    test('keeps the jobs written in a transaction that rolls back: none', async () => {
      await expect(database.run(async () => {
        await database.outbox.add([job('f[a].b_on_c')])
        throw new Error('boom')
      })).rejects.toThrow('boom')

      expect(await database.outbox.list()).toEqual([])
    })

    test('keeps none of the jobs of a transaction that rolls back, even when a callback after the rollback fails', async () => {
      await expect(database.run(async () => {
        await database.outbox.add([job('f[a].b_on_c')])
        database.afterRollback(() => {
          throw new Error('a callback broke')
        })
        throw new Error('boom')
      })).rejects.toThrow('boom')

      expect(await database.outbox.list()).toEqual([])
    })

    test('a failing afterCommit leaves the others to run, and the transaction committed with its value', async () => {
      const ran: string[] = []

      const value = await database.run(async () => {
        await database.outbox.add([job('f[a].b_on_c')])
        database.afterCommit(() => {
          throw new Error('a callback broke')
        })
        database.afterCommit(() => ran.push('second'))
        return 'done'
      })

      expect(value).toBe('done')
      expect(ran).toEqual(['second'])
      expect(await database.outbox.list()).toHaveLength(1)
    })

    test('reads outside a transaction see only the jobs committed', async () => {
      const added = job('f[a].b_on_c')
      let wrote = () => {}
      const written = new Promise<void>(resolve => {
        wrote = resolve
      })
      let letGo = () => {}
      const held = new Promise<void>(resolve => {
        letGo = resolve
      })
      const writing = database.run(async () => {
        await database.outbox.add([added])
        expect(await database.outbox.get(added.id)).toEqual(added)
        wrote()
        await held
      })
      await written

      expect(await database.outbox.get(added.id)).toBeUndefined()
      expect(await database.outbox.list()).toEqual([])
      expect(await database.outbox.waiting()).toEqual([])
      expect(await database.outbox.depth(at(0))).toEqual([])
      letGo()
      await writing
      expect(await database.outbox.get(added.id)).toEqual(added)
    })

    test('hands a job to one claim only, and closes it only from that claim', async () => {
      await database.outbox.add([job('f[a].b_on_c')])
      const later = new Date(Date.now() + 60_000).toISOString()

      const [claimed] = await database.outbox.claim(['f[a].b_on_c'], 10, 'w1', later, at(0))
      expect(await database.outbox.claim(['f[a].b_on_c'], 10, 'w2', later, at(0))).toEqual([])
      expect(await database.outbox.renew(claimed!, '2000-01-01T00:00:00.000Z', at(0))).toBe(true)
      const [again] = await database.outbox.claim(['f[a].b_on_c'], 10, 'w2', later, at(0))
      expect(await database.outbox.renew(claimed!, later, at(0))).toBe(false)
      expect(await database.outbox.close(claimed!, { status: 'done', lastError: null }, at(0))).toBe(false)

      expect(again?.attempts).toBe(2)
      expect((await database.outbox.list())[0]).toMatchObject({ status: 'running', attempts: 2, lockedBy: 'w2' })
    })

    test('counts the jobs of each queue still to run, and only those', async () => {
      await database.outbox.add([job('f[a].b_on_c'), job('f[a].b_on_c'), job('f[d].e_on_f'), job('f[g].h_on_i')])
      const [claimed] = await database.outbox.claim(['f[g].h_on_i'], 1, 'w1', new Date(Date.now() + 60_000).toISOString(), at(0))
      await database.outbox.close(claimed!, { status: 'done', lastError: null }, at(0))
      await database.outbox.claim(['f[d].e_on_f'], 1, 'w1', new Date(Date.now() + 60_000).toISOString(), at(0))

      expect(await database.outbox.waiting()).toEqual([{ queue: 'f[a].b_on_c', jobs: 2 }, { queue: 'f[d].e_on_f', jobs: 1 }])
    })

    test('says how full each queue is: ready, retrying, running, dead, and its oldest job due', async () => {
      const early = { ...job('f[a].b_on_c'), runAfter: '2026-01-01T09:00:00.000Z' }
      const later = { ...job('f[a].b_on_c'), runAfter: '2026-01-01T11:00:00.000Z' }
      await database.outbox.add([early, later, job('f[d].e_on_f'), job('f[d].e_on_f'), job('f[g].h_on_i'), job('f[g].h_on_i')])
      const lease = new Date(Date.now() + 60_000).toISOString()
      const [failed] = await database.outbox.claim(['f[d].e_on_f'], 1, 'w1', lease, at(0))
      await database.outbox.close(failed!, { status: 'pending', lastError: 'not yet', runAfter: '2099-01-01T00:00:00.000Z' }, at(0))
      await database.outbox.claim(['f[d].e_on_f'], 1, 'w2', lease, at(0))
      const [done, dead] = await database.outbox.claim(['f[g].h_on_i'], 2, 'w3', lease, at(0))
      await database.outbox.close(done!, { status: 'done', lastError: null }, at(0))
      await database.outbox.close(dead!, { status: 'dead', lastError: 'out of attempts' }, at(0))

      expect(await database.outbox.depth('2026-01-01T10:00:00.000Z')).toEqual([
        { queue: 'f[a].b_on_c', ready: 2, retrying: 0, running: 0, dead: 0, oldestDueAt: '2026-01-01T09:00:00.000Z' },
        { queue: 'f[d].e_on_f', ready: 0, retrying: 1, running: 1, dead: 0, oldestDueAt: null },
        { queue: 'f[g].h_on_i', ready: 0, retrying: 0, running: 0, dead: 1, oldestDueAt: null },
      ])
    })

    test('puts a dead job back to wait, as new, and leaves any other as it is', async () => {
      const dead = job('f[a].b_on_c')
      const alive = job('f[a].b_on_c')
      await database.outbox.add([dead, alive])
      const [claimed] = await database.outbox.claim(['f[a].b_on_c'], 1, 'w1', new Date(Date.now() + 60_000).toISOString(), at(0))
      await database.outbox.close(claimed!, { status: 'dead', lastError: 'boom' }, at(0))

      expect(await database.outbox.retry(claimed!.id, at(0))).toBe(true)
      expect(await database.outbox.retry(claimed!.id, at(0))).toBe(false)
      expect(await database.outbox.retry('none', at(0))).toBe(false)
      const retried = (await database.outbox.list()).find(each => each.id === claimed!.id)
      expect(retried).toMatchObject({ status: 'pending', attempts: 0, lockedBy: null, lockedUntil: null, lastError: 'boom' })
      expect((await database.outbox.claim(['f[a].b_on_c'], 10, 'w2', new Date(Date.now() + 60_000).toISOString(), at(0))).map(each => each.id).sort()).toEqual([dead.id, alive.id].sort())
    })

    test('remembers the queues and forgets jobs done long ago', async () => {
      await database.outbox.seen([{ name: 'f[a].b_on_c', event: 'c', attempts: 3 }], at(0))
      await database.outbox.add([job('f[a].b_on_c')])
      const [claimed] = await database.outbox.claim(['f[a].b_on_c'], 1, 'w1', new Date(Date.now() + 60_000).toISOString(), at(0))
      await database.outbox.close(claimed!, { status: 'done', lastError: null }, at(0))
      await database.outbox.purge(new Date(Date.now() + 1_000).toISOString())

      expect(await database.outbox.queues()).toEqual([{ name: 'f[a].b_on_c', event: 'c', attempts: 3, lastSeenAt: expect.any(String) }])
      expect(await database.outbox.list()).toEqual([])
    })

    test('claims up to its limit, the ones due first first, of its queues only', async () => {
      await database.outbox.add([
        { ...job('f[a].b_on_c'), id: 'later', runAfter: at(-1_000) },
        { ...job('f[a].b_on_c'), id: 'first', runAfter: at(-3_000) },
        { ...job('f[a].b_on_c'), id: 'second', runAfter: at(-2_000) },
        { ...job('f[x].y_on_z'), id: 'other' },
        { ...job('f[a].b_on_c'), id: 'not-yet', runAfter: at(60_000) },
      ])

      expect((await database.outbox.claim(['f[a].b_on_c'], 1, 'w1', lease(), at(0))).map(each => each.id)).toEqual(['first'])
      expect((await database.outbox.claim(['f[a].b_on_c'], 1, 'w1', lease(), at(0))).map(each => each.id)).toEqual(['second'])
      expect((await database.outbox.claim(['f[a].b_on_c'], 2, 'w1', lease(), at(0))).map(each => each.id)).toEqual(['later'])
    })

    test('claims what is due as of the time it is given: the worker clock', async () => {
      await database.outbox.add([{ ...job('f[a].b_on_c'), id: 'soon', runAfter: at(60_000) }])

      expect(await database.outbox.claim(['f[a].b_on_c'], 1, 'w1', at(120_000), at(59_000))).toEqual([])
      expect((await database.outbox.claim(['f[a].b_on_c'], 1, 'w1', at(120_000), at(60_000))).map(each => each.id)).toEqual(['soon'])
      expect(await database.outbox.claim(['f[a].b_on_c'], 1, 'w2', at(180_000), at(119_000))).toEqual([])
      expect((await database.outbox.claim(['f[a].b_on_c'], 1, 'w2', at(180_000), at(121_000))).map(each => each.lockedBy)).toEqual(['w2'])
    })

    test('two claims at once never take the same job', async () => {
      await database.outbox.add([{ ...job('f[a].b_on_c'), id: 'one' }, { ...job('f[a].b_on_c'), id: 'two' }])

      const outcomes = await Promise.allSettled([
        database.outbox.claim(['f[a].b_on_c'], 1, 'w1', lease(), at(0)),
        database.outbox.claim(['f[a].b_on_c'], 1, 'w2', lease(), at(0)),
      ])

      const claimed = outcomes.flatMap(outcome => (outcome.status === 'fulfilled' ? outcome.value : [])).map(each => each.id)
      for (const outcome of outcomes) {
        if (outcome.status === 'rejected') {
          expect(outcome.reason).toBeInstanceOf(ConcurrencyConflict)
        }
      }
      expect(claimed.length).toBeGreaterThan(0)
      expect(new Set(claimed).size).toBe(claimed.length)
    })

    test('closing a claim to retry moves when it runs, and frees it', async () => {
      await database.outbox.add([job('f[a].b_on_c')])
      const [claimed] = await database.outbox.claim(['f[a].b_on_c'], 1, 'w1', lease(), at(0))
      const retry = at(30_000)

      await database.outbox.close(claimed!, { status: 'pending', lastError: 'boom', runAfter: retry }, at(0))

      expect((await database.outbox.list())[0]).toMatchObject({ status: 'pending', lastError: 'boom', runAfter: retry, lockedBy: null, lockedUntil: null })
    })

    test('closing a claim that gives its attempt back leaves the job with the attempts it had before', async () => {
      await database.outbox.add([job('f[a].b_on_c')])
      const [first] = await database.outbox.claim(['f[a].b_on_c'], 1, 'w1', lease(), at(0))
      await database.outbox.close(first!, { status: 'pending', lastError: 'boom', runAfter: at(-1_000) }, at(0))
      const [second] = await database.outbox.claim(['f[a].b_on_c'], 1, 'w2', lease(), at(0))

      expect(await database.outbox.close(second!, { status: 'pending', lastError: 'boom', runAfter: at(-1_000), giveBack: true }, at(0))).toBe(true)

      expect((await database.outbox.list())[0]).toMatchObject({ status: 'pending', attempts: 1, lastError: 'boom', lockedBy: null })
      expect((await database.outbox.claim(['f[a].b_on_c'], 1, 'w3', lease(), at(0)))[0]).toMatchObject({ attempts: 2, lockedBy: 'w3' })
    })

    test('a claim already closed changes nothing more', async () => {
      await database.outbox.add([job('f[a].b_on_c')])
      const [claimed] = await database.outbox.claim(['f[a].b_on_c'], 1, 'w1', lease(), at(0))
      expect(await database.outbox.close(claimed!, { status: 'done', lastError: null }, at(0))).toBe(true)

      expect(await database.outbox.close(claimed!, { status: 'dead', lastError: 'late' }, at(0))).toBe(false)
      expect(await database.outbox.renew(claimed!, at(120_000), at(0))).toBe(false)

      expect((await database.outbox.list())[0]).toMatchObject({ status: 'done', lastError: null, lockedUntil: null })
    })

    test('a claim from before a retry closes nothing of the claim after it', async () => {
      await database.outbox.add([job('f[a].b_on_c')])
      const [stale] = await database.outbox.claim(['f[a].b_on_c'], 1, 'A/1', at(-1_000), at(0))
      const [buried] = await database.outbox.claim(['f[a].b_on_c'], 1, 'B/1', lease(), at(0))
      await database.outbox.close(buried!, { status: 'dead', lastError: 'gave up' }, at(0))
      await database.outbox.retry(stale!.id, at(0))
      await database.outbox.claim(['f[a].b_on_c'], 1, 'C/1', lease(), at(0))

      await database.outbox.renew(stale!, at(120_000), at(0))
      await database.outbox.close(stale!, { status: 'dead', lastError: 'stale' }, at(0))

      expect((await database.outbox.list())[0]).toMatchObject({ status: 'running', attempts: 1, lockedBy: 'C/1', lastError: 'gave up' })
    })

    test('purges only jobs done: pending, running and dead ones stay', async () => {
      await database.outbox.add([{ ...job('f[a].b_on_c'), id: 'pending' }, { ...job('f[a].b_on_c'), id: 'dead' }, { ...job('f[a].b_on_c'), id: 'running' }])
      const claimed = await database.outbox.claim(['f[a].b_on_c'], 2, 'w1', lease(), at(0))
      await database.outbox.close(claimed.find(each => each.id === 'dead') ?? claimed[0]!, { status: 'dead', lastError: 'gave up' }, at(0))

      await database.outbox.purge(at(1_000))

      expect((await database.outbox.list()).length).toBe(3)
    })

    test('purges only what was done before the time it is given', async () => {
      await database.outbox.add([job('f[a].b_on_c')])
      const [claimed] = await database.outbox.claim(['f[a].b_on_c'], 1, 'w1', lease(), at(0))
      await database.outbox.close(claimed!, { status: 'done', lastError: null }, at(0))

      await database.outbox.purge(at(-60_000))

      expect(await database.outbox.list()).toHaveLength(1)
    })

    test('renewing and closing a claim say when they changed it', async () => {
      await database.outbox.add([{ ...job('f[a].b_on_c'), updatedAt: at(-60_000) }])
      const [claimed] = await database.outbox.claim(['f[a].b_on_c'], 1, 'w1', lease(), at(0))
      const claimedAt = (await database.outbox.list())[0]!.updatedAt
      await pause(5)
      await database.outbox.renew(claimed!, lease(), at(0))
      const renewedAt = (await database.outbox.list())[0]!.updatedAt
      await pause(5)
      await database.outbox.close(claimed!, { status: 'done', lastError: null }, at(0))

      expect(renewedAt > claimedAt).toBe(true)
      expect((await database.outbox.list())[0]!.updatedAt > renewedAt).toBe(true)
    })

    test('lists the queues by name', async () => {
      await database.outbox.seen([{ name: 'f[z].b_on_c', event: 'c', attempts: 1 }, { name: 'f[a].b_on_c', event: 'c', attempts: 1 }], at(0))

      expect((await database.outbox.queues()).map(queue => queue.name)).toEqual(['f[a].b_on_c', 'f[z].b_on_c'])
    })

    test('a queue seen again says what it is now, and when', async () => {
      await database.outbox.seen([{ name: 'f[a].b_on_c', event: 'c', attempts: 3 }], at(0))
      const [first] = await database.outbox.queues()
      await pause(5)
      await database.outbox.seen([{ name: 'f[a].b_on_c', event: 'c.*', attempts: 5 }], at(0))

      const [again] = await database.outbox.queues()
      expect(again).toMatchObject({ name: 'f[a].b_on_c', event: 'c.*', attempts: 5 })
      expect(again!.lastSeenAt > first!.lastSeenAt).toBe(true)
    })

    test('lists the jobs oldest first', async () => {
      await database.outbox.add([{ ...job('f[a].b_on_c'), id: 'a', createdAt: at(-1_000) }, { ...job('f[a].b_on_c'), id: 'b', createdAt: at(-2_000) }])

      expect((await database.outbox.list()).map(each => each.id)).toEqual(['b', 'a'])
    })

    test('lists the jobs of one status, a page at a time, after the last job of the page before', async () => {
      const created = at(-10_000)
      await database.outbox.add([
        { ...job('f[a].b_on_c'), id: 'j2', createdAt: created },
        { ...job('f[a].b_on_c'), id: 'j1', createdAt: created },
        { ...job('f[a].b_on_c'), id: 'j3', createdAt: at(-5_000) },
        { ...job('f[a].b_on_c'), id: 'j0', createdAt: at(-20_000), status: 'dead' },
        { ...job('f[a].b_on_c'), id: 'j4', createdAt: at(-1_000) },
      ])
      const ids = async (query: Parameters<typeof database.outbox.list>[0]) => (await database.outbox.list(query)).map(each => each.id)

      expect(await ids({ status: 'pending', limit: 2 })).toEqual(['j1', 'j2'])
      expect(await ids({ status: 'pending', limit: 2, after: 'j2' })).toEqual(['j3', 'j4'])
      expect(await ids({ status: 'pending', after: 'j4' })).toEqual([])
      expect(await ids({ after: 'j0', limit: 1 })).toEqual(['j1'])
      expect(await ids({ status: 'dead' })).toEqual(['j0'])
      expect(await ids({ status: 'done' })).toEqual([])
      expect(await ids({ limit: 0 })).toEqual([])
    })

    test('gets one job by its id, and none for an id it does not keep', async () => {
      const kept = job('f[a].b_on_c')
      await database.outbox.add([kept, job('f[a].b_on_c')])

      expect(await database.outbox.get(kept.id)).toEqual(kept)
      expect(await database.outbox.get('none')).toBeUndefined()
    })

    test('goes by the time it is given, the worker clock, never its own: in what it stamps, claims and purges', async () => {
      const t = (ms: number) => new Date(Date.parse('2000-01-01T00:00:00.000Z') + ms).toISOString()
      await database.outbox.add([{ ...job('f[a].b_on_c'), runAfter: t(0), createdAt: t(0), updatedAt: t(0) }])
      const [claimed] = await database.outbox.claim(['f[a].b_on_c'], 1, 'w1', t(60_000), t(1_000))
      expect(claimed).toMatchObject({ updatedAt: t(1_000) })

      expect(await database.outbox.renew(claimed!, t(120_000), t(2_000))).toBe(true)
      expect(await database.outbox.get(claimed!.id)).toMatchObject({ lockedUntil: t(120_000), updatedAt: t(2_000) })
      expect(await database.outbox.close(claimed!, { status: 'dead', lastError: 'boom' }, t(3_000))).toBe(true)
      expect(await database.outbox.get(claimed!.id)).toMatchObject({ status: 'dead', updatedAt: t(3_000) })

      expect(await database.outbox.retry(claimed!.id, t(4_000))).toBe(true)
      expect(await database.outbox.get(claimed!.id)).toMatchObject({ status: 'pending', runAfter: t(4_000), updatedAt: t(4_000) })
      const [again] = await database.outbox.claim(['f[a].b_on_c'], 1, 'w1', t(64_000), t(4_000))
      expect(again?.id).toBe(claimed!.id)

      await database.outbox.close(again!, { status: 'done', lastError: null }, t(5_000))
      await database.outbox.purge(t(5_000))
      expect(await database.outbox.list()).toHaveLength(1)
      await database.outbox.purge(t(5_001))
      expect(await database.outbox.list()).toEqual([])

      await database.outbox.seen([{ name: 'f[a].b_on_c', event: 'c', attempts: 3 }], t(6_000))
      expect(await database.outbox.queues()).toEqual([{ name: 'f[a].b_on_c', event: 'c', attempts: 3, lastSeenAt: t(6_000) }])
    })
  })
}
