import { describe }               from 'bun:test'
import { expect }                 from 'bun:test'
import { test }                   from 'bun:test'
import { z }                      from 'zod'
// --------------------------------------------------------
import { MemoryTransactions }     from '../../../adapters/database/memory/memory-transactions/memory-transactions'
import { clockScope }             from '../../clock/clock-scope/clock-scope'
import type { Criteria }          from '../../criteria/criteria/criteria'
import { matches }                from '../../criteria/matches/matches'
import type { EntityInput }       from '../../entity/entity-input'
import { Entity }                 from '../../entity/entity/entity'
import { SaveRolledBack }         from '../../entity/errors/save-rolled-back/save-rolled-back'
import { forRepository }          from '../../entity/for-repository/for-repository'
import { ConcurrencyConflict }    from '../../errors/concurrency-conflict/concurrency-conflict'
import { StaleVersion }           from '../../errors/stale-version/stale-version'
import type { DomainEvent }       from '../../events/event/domain-event'
import { UseCaseRunner }          from '../../use-case/use-case-runner/use-case-runner'
import type { FindOptions }       from '../records/find-options'
import type { NewRow }            from '../records/new-row'
import type { Records }           from '../records/records'
import type { RepositoryDeps }    from '../repository-deps'
import type { RepositoryOptions } from '../repository-options'
import type { SaveHooks }         from '../save-hooks'
import type { SaveInProgress }    from '../transactions/save-in-progress'
import { TransactionSpoiled }     from '../transactions/transaction-spoiled/transaction-spoiled'
import type { Transactions }      from '../transactions/transactions'
import { Repository }             from './repository'

const ThingSchema = z.object({ id: z.string(), name: z.string(), createdAt: z.string().default(''), updatedAt: z.string().default('') })
type ThingDTO = z.infer<typeof ThingSchema>
type ThingRow = ThingDTO & { version: number, deletedAt?: string | null }

class Thing extends Entity<typeof ThingSchema> {
  static create(name: string) {
    const thing = new Thing(ThingSchema, { name } as EntityInput<ThingDTO>, true)
    thing.trackEvent({ name: 'thing.created', payload: name, occurredAt: '' })
    return thing
  }

  static fromRow(row: ThingRow) {
    return new Thing(ThingSchema, row, false)
  }

  rename(name: string) {
    this.change({ name })
    this.trackEvent({ name: 'thing.renamed', payload: name, occurredAt: '' })
  }

  remove() {
    this.markAsDeleted()
  }

  ping() {
    this.trackEvent({ name: 'thing.pinged', payload: null, occurredAt: '' })
  }
}

async function world(options: RepositoryOptions<ThingRow> = { scope: 'none' }, rows: ThingRow[] = []) {
  const log: string[] = []
  let failNextWrite = false
  const updates: Partial<NewRow<ThingRow>>[] = []

  const records: Records<ThingRow> = {
    async find(criteria?: Criteria<ThingRow>, findOptions?: FindOptions<ThingRow>) {
      log.push(`find ${JSON.stringify(criteria)} ${JSON.stringify(findOptions ?? {})}`)
      return rows.filter(row => matches(row, criteria)).slice(0, findOptions?.limit)
    },
    async count(criteria?: Criteria<ThingRow>) {
      log.push(`count ${JSON.stringify(criteria)}`)
      return rows.filter(row => matches(row, criteria)).length
    },
    async countBy(criteria: Criteria<ThingRow> | undefined, fields: readonly string[]) {
      log.push(`countBy ${JSON.stringify(criteria)} ${fields.join(',')}`)
      return []
    },
    async insert(row: NewRow<ThingRow>) {
      log.push(`insert ${JSON.stringify(row)}`)
    },
    async update(id: string, version: number, changes: Partial<NewRow<ThingRow>>) {
      if (failNextWrite) {
        throw new StaleVersion()
      }
      log.push(`update ${id}@${version} ${JSON.stringify(Object.keys(changes).sort())}`)
      updates.push(changes)
    },
    async delete(id: string, version: number) {
      log.push(`delete ${id}@${version}`)
    },
    async deleteMany(criteria: Criteria<ThingRow>) {
      log.push(`deleteMany ${JSON.stringify(criteria)}`)
      return rows.filter(row => matches(row, criteria)).length
    },
  }

  const real = new MemoryTransactions()
  const logged = <T>(fn: () => T | Promise<T>) => () => {
    log.push('begin')
    real.afterCommit(() => log.push('commit'))
    real.afterRollback(() => log.push('rollback'))
    return fn()
  }
  const transactions: Transactions = {
    run: <T>(fn: () => T | Promise<T>) => (real.inTransaction ? real.run(fn) : real.run(logged(fn))),
    save: <T>(fn: (save: SaveInProgress) => Promise<T>) => (real.inTransaction ? real.save(fn) : real.save(async save => logged(() => fn(save))())),
    guard: async (keys: string[]) => {
      log.push(`guard ${keys.join(',')}`)
      await real.guard(keys)
    },
    afterRollback: fn => real.afterRollback(fn),
  }

  let refuseWrites = false
  const deps: RepositoryDeps = {
    transactions,
    bus: { publish: (event: DomainEvent) => void log.push(`publish ${event.name}`) },
    useCaseRunner: {
      checkWriteRule: () => {
        log.push('checkWrite')
        if (refuseWrites) {
          throw new Error('write rule')
        }
      },
      checkOneModulePerTransaction: () => {},
      checkGuardRule: () => {},
    } as unknown as UseCaseRunner,
  }

  class Things extends Repository<Thing, ThingRow> {
    protected toEntity(row: ThingRow) {
      return Thing.fromRow(row)
    }

    saveWith(entities: Thing[], hooks: SaveHooks) {
      return this.save(entities, entity => this.write(entity), hooks)
    }

    saveUnlessStale(entities: Thing[], stale: () => boolean) {
      return this.save(entities, entity => this.write(entity), {
        guard: ['things'],
        after: () => {
          if (stale()) {
            throw new StaleVersion()
          }
        },
      })
    }

    purgeNamed(name: string) {
      return this.purge({ name })
    }

    stamp(guard?: string[]) {
      return this.saveRows(() => this.records.insert({ id: 'stamp', name: 'stamped' } as never), { guard })
    }
  }

  return {
    log,
    updates,
    transactions,
    repo: new Things(deps, records, options),
    failNextWrite: () => {
      failNextWrite = true
    },
    refuseWrites: () => {
      refuseWrites = true
    },
  }
}

const stored = (over: Partial<ThingRow> = {}): ThingRow => ({ id: 't1', name: 'one', createdAt: 'c', updatedAt: 'u', version: 2, ...over })

describe('persist', () => {
  test('inserts a new one, tells its events in the transaction, and marks it saved once it commits', async () => {
    const { log, repo } = await world()
    const thing = Thing.create('one')

    await repo.persist(thing)

    expect(log).toEqual(['checkWrite', 'begin', `insert ${JSON.stringify(thing.toDTO())}`, 'publish thing.created', 'commit'])
    expect(thing.isNew).toBe(false)
    expect(thing.version).toBe(1)
  })

  test('changes a stored one at the version it was read, writing only what changed', async () => {
    const { log, repo } = await world()
    const thing = Thing.fromRow(stored())
    thing.rename('two')

    await repo.persist(thing)

    expect(log).toEqual(['checkWrite', 'begin', 'update t1@2 ["name","updatedAt"]', 'publish thing.renamed', 'commit'])
    expect(thing.version).toBe(3)
  })

  test('writes nothing for one with nothing to save, and leaves its version', async () => {
    const { log, repo } = await world()
    const unchanged = Thing.fromRow(stored())

    await repo.persist(unchanged)

    expect(log).toEqual(['checkWrite', 'begin', 'commit'])
    expect(unchanged.version).toBe(2)
  })

  test('a change undone is no change: it writes nothing and tells nothing', async () => {
    const { log, repo } = await world()
    const thing = Thing.fromRow(stored())

    thing.rename('two')
    thing.rename('one')
    await repo.persist(thing)

    expect(log).toEqual(['checkWrite', 'begin', 'commit'])
    expect(thing[forRepository].takeEvents()).toEqual([])
  })

  test('a change undone covers only the save it was undone in, not an event told after it', async () => {
    const { repo } = await world()
    const thing = Thing.fromRow(stored())
    thing.rename('two')
    thing.rename('one')
    await repo.persist(thing)

    thing.ping()

    await expect(repo.persist(thing)).rejects.toThrow('Thing t1 tells thing.pinged but has nothing to save: change what it tells of')
  })

  test('one that tells something but never changed is refused, and nothing of the save is written', async () => {
    const { log, repo } = await world()
    const thing = Thing.fromRow(stored())
    thing.ping()

    await expect(repo.persist([Thing.create('two'), thing])).rejects.toThrow('Thing t1 tells thing.pinged but has nothing to save: change what it tells of')

    expect(log).toEqual(['checkWrite'])
  })

  test('deletes a deleted one at its version, or stamps it when deleting softly', async () => {
    const hard = await world()
    const gone = Thing.fromRow(stored())
    gone.remove()
    await hard.repo.persist(gone)

    const soft = await world({ softDelete: true, scope: 'none' })
    const stamped = Thing.fromRow(stored({ deletedAt: null }))
    stamped.remove()
    await soft.repo.persist(stamped)

    expect(hard.log).toContain('delete t1@2')
    expect(soft.log).toContain('update t1@2 ["deletedAt","updatedAt"]')
  })

  test('stamps a soft deletion by the clock of the context at work', async () => {
    const { updates, repo } = await world({ softDelete: true, scope: 'none' })
    const thing = Thing.fromRow(stored({ deletedAt: null }))
    thing.remove()

    await clockScope.run({ now: () => new Date('2031-01-02T03:04:05.000Z') }, () => repo.persist(thing))

    expect(updates).toEqual([{ deletedAt: '2031-01-02T03:04:05.000Z', updatedAt: '2031-01-02T03:04:05.000Z' }])
  })

  test('a new row deleted softly is stored with deletedAt null', async () => {
    const { log, repo } = await world({ softDelete: true, scope: 'none' })

    await repo.persist(Thing.create('one'))

    expect(log[2]).toContain('"deletedAt":null')
  })

  test('a conflict rolls it all back: nothing told, nothing marked saved', async () => {
    const { log, repo, failNextWrite } = await world()
    const thing = Thing.fromRow(stored())
    thing.rename('two')
    failNextWrite()

    await expect(repo.persist(thing)).rejects.toThrow(StaleVersion)

    expect(log).toEqual(['checkWrite', 'begin', 'rollback'])
    expect(thing.version).toBe(2)
    expect(thing.hasPendingChanges).toBe(true)
  })

  test('inside a transaction that rolls back later, it is not marked saved', async () => {
    const { repo, transactions } = await world()
    const thing = Thing.fromRow(stored())
    thing.rename('two')

    await transactions.run(async () => {
      await repo.persist(thing)
      throw new Error('later step failed')
    }).catch(() => {})

    expect(thing.version).toBe(2)
    expect(thing.hasPendingChanges).toBe(true)
  })

  test('inside a transaction that rolls back later, a deletion is left unsaved, and a new one new again', async () => {
    const { repo, transactions } = await world()
    const deleted = Thing.fromRow(stored())
    deleted.remove()
    const created = Thing.create('one')

    await transactions.run(async () => {
      await repo.persist([deleted, created])
      throw new Error('later step failed')
    }).catch(() => {})

    expect([deleted.version, deleted.hasPendingChanges]).toEqual([2, true])
    expect([created.isNew, created.version]).toEqual([true, 0])
  })

  test('joined to a transaction, and failing, rolls it all back, even if its error was caught', async () => {
    const { log, repo, transactions, failNextWrite } = await world()
    const created = Thing.create('one')
    const changed = Thing.fromRow(stored())
    changed.rename('two')

    const spoiled = transactions.run(async () => {
      failNextWrite()
      await repo.persist([created, changed]).catch(() => {})
    })

    await expect(spoiled).rejects.toThrow(TransactionSpoiled)
    expect(log).toEqual(['begin', 'checkWrite', expect.stringMatching(/^insert /), 'rollback'])
    expect([created.isNew, created.version]).toEqual([true, 0])
  })

  test('one whose save rolled back is never saved again: a change since would tell less than it writes', async () => {
    const { log, repo, transactions } = await world()
    const thing = Thing.fromRow(stored())
    thing.rename('two')

    await transactions.run(async () => {
      await repo.persist(thing)
      thing.rename('three')
      throw new Error('later step failed')
    }).catch(() => {})
    log.length = 0

    await expect(repo.persist(thing)).rejects.toThrow(SaveRolledBack)
    await expect(repo.persist(thing)).rejects.toThrow('Thing t1 was in a save that rolled back: read it again, and save that one')
    expect(log).toEqual(['checkWrite', 'checkWrite'])
  })

  test('so is one whose own save failed', async () => {
    const { repo, failNextWrite } = await world()
    const thing = Thing.fromRow(stored())
    thing.rename('two')
    failNextWrite()

    await expect(repo.persist(thing)).rejects.toThrow(StaleVersion)

    await expect(repo.persist(thing)).rejects.toThrow(SaveRolledBack)
  })

  test('saved twice in one transaction, the second writes what changed since, one version on', async () => {
    const { log, repo, transactions } = await world()
    const thing = Thing.create('one')

    await transactions.run(async () => {
      await repo.persist(thing)
      thing.rename('two')
      await repo.persist(thing)
    })

    expect(log.map(line => line.split(' ')[0])).toEqual(['begin', 'checkWrite', 'insert', 'publish', 'checkWrite', 'update', 'publish', 'commit'])
    expect(log).toContain(`update ${thing.id}@1 ["name","updatedAt"]`)
    expect(log).toContain('publish thing.renamed')
    expect(thing.version).toBe(2)
  })

  test('a change after the save, in the same transaction, is still to save once it commits', async () => {
    const { repo, transactions } = await world()
    const thing = Thing.create('one')

    await transactions.run(async () => {
      await repo.persist(thing)
      thing.rename('two')
    })

    expect(thing.version).toBe(1)
    expect(thing.getChanges()).toEqual({ name: 'two' })
    expect(thing[forRepository].takeEvents().map(event => event.name)).toEqual(['thing.renamed'])
  })

  test('a conflict puts back the ones it already wrote', async () => {
    const { repo, failNextWrite } = await world()
    const fresh = Thing.create('one')
    const stale = Thing.fromRow(stored())
    stale.rename('two')
    failNextWrite()

    await expect(repo.persist([fresh, stale])).rejects.toThrow(StaleVersion)

    expect([fresh.isNew, fresh.version, fresh.hasPendingChanges]).toEqual([true, 0, true])
    expect(fresh[forRepository].takeEvents().map(event => event.name)).toEqual(['thing.created'])
  })

  test('the write rule is asked first, and a refusal writes nothing', async () => {
    const { log, repo, refuseWrites } = await world()
    refuseWrites()

    await expect(repo.persist(Thing.create('one'))).rejects.toThrow('write rule')

    expect(log).toEqual(['checkWrite'])
  })
})

describe('save with hooks', () => {
  test('guards, writes what goes first, the entities, what follows, then tells', async () => {
    const { log, repo } = await world()

    await repo.saveWith([Thing.create('one')], {
      guard: ['stock:p1', 'stock:p2'],
      before: () => void log.push('before'),
      after: () => void log.push('after'),
    })

    expect(log.map(line => line.split(' ')[0])).toEqual(['checkWrite', 'begin', 'guard', 'before', 'insert', 'after', 'publish', 'commit'])
    expect(log[2]).toBe('guard stock:p1,stock:p2')
  })

  test('a conflict from after, for a row it holds no version of, rolls it all back for the use case to run again', async () => {
    const { log, repo } = await world()

    await expect(repo.saveUnlessStale([Thing.create('one')], () => true)).rejects.toBeInstanceOf(ConcurrencyConflict)
    await repo.saveUnlessStale([Thing.create('two')], () => false)

    expect(log.filter(line => !line.startsWith('insert'))).toEqual(['checkWrite', 'begin', 'guard things', 'rollback', 'checkWrite', 'begin', 'guard things', 'publish thing.created', 'commit'])
  })

  test('guards nothing when it names nothing', async () => {
    const { log, repo } = await world()

    await repo.saveWith([Thing.create('one')], { guard: [] })

    expect(log.some(line => line.startsWith('guard'))).toBe(false)
  })

  test('an after names what it guards, even if it is nothing', () => {
    // @ts-expect-error: an after without a guard
    const unguarded: SaveHooks = { after: () => {} }
    const none: SaveHooks = { guard: [], after: () => {} }
    const plain: SaveHooks = { before: () => {} }

    expect([unguarded, none, plain]).toHaveLength(3)
  })
})

describe('saveRows', () => {
  test('writes rows as a save does: under the write rule, in a transaction, guarding what it names', async () => {
    const { log, repo } = await world()

    await repo.stamp(['index:t1'])

    expect(log.map(line => line.split(' ')[0])).toEqual(['checkWrite', 'begin', 'guard', 'insert', 'commit'])
    expect(log[2]).toBe('guard index:t1')
  })

  test('guards nothing when it names nothing', async () => {
    const { log, repo } = await world()

    await repo.stamp()

    expect(log.some(line => line.startsWith('guard'))).toBe(false)
  })
})

describe('purge', () => {
  test('removes the rows the criteria name, whatever the scope or deletedAt, as saveRows writes; how many', async () => {
    const { log, repo } = await world({ softDelete: true, scope: { field: 'name', current: () => 'one' } }, [stored({ name: 'two' }), stored({ id: 't2', name: 'two', deletedAt: 'd' })])

    expect(await repo.purgeNamed('two')).toBe(2)
    expect(log).toEqual(['checkWrite', 'begin', 'deleteMany {"name":"two"}', 'commit'])
  })

  test('is refused by the write rule, removing nothing', async () => {
    const { log, repo, refuseWrites } = await world()
    refuseWrites()

    await expect(repo.purgeNamed('one')).rejects.toThrow('write rule')
    expect(log).toEqual(['checkWrite'])
  })
})

describe('a scope', () => {
  // The scope here is the name: what the unit needs is a string field of the row.
  const scoped = { softDelete: true, scope: { field: 'name' as const, current: () => 'one' } }

  test("is said by every repository, or said to be 'none': left out, it does not compile", () => {
    // @ts-expect-error: a scope is never dropped by leaving it out
    const unsaid: RepositoryOptions<ThingRow> = { softDelete: true }
    // @ts-expect-error: nor by passing no options at all
    const nothing: ConstructorParameters<typeof Repository<Thing, ThingRow>> = [{} as never, {} as never]
    const none: RepositoryOptions<ThingRow> = { scope: 'none' }
    expect([unsaid, nothing, none]).toHaveLength(3)
  })

  test('is part of every query, beside the deleted ones left out, whatever the criteria say', async () => {
    const { log, repo } = await world(scoped)

    await repo.find({ name: 'two' })

    expect(log[0]).toBe('find {"and":[{"and":[{"name":"two"},{"name":"one"}]},{"deletedAt":null}]} {}')
  })

  test('is left out by findInEveryScope, which still leaves the deleted ones out', async () => {
    const { log, repo } = await world(scoped)

    await repo.find({}, { everyScope: true })

    expect(log[0]).toBe('find {"and":[{},{"deletedAt":null}]} {}')
  })

  test('refuses to delete an entity of another one', async () => {
    const { log, repo } = await world(scoped)
    const thing = Thing.fromRow(stored({ name: 'two' }))
    thing.remove()

    await expect(repo.persist(thing)).rejects.toThrow('not to the current one')
    expect(log).toContain('rollback')
    expect(log.some(line => line.startsWith('update') || line.startsWith('delete'))).toBe(false)
  })
  test('refuses to save one stored in another, though moved to it', async () => {
    const { log, repo } = await world(scoped)
    const moved = Thing.fromRow(stored({ name: 'two' }))
    moved.rename('one')
    const deleted = Thing.fromRow(stored({ name: 'two' }))
    deleted.rename('one')
    deleted.remove()

    await expect(repo.persist(moved)).rejects.toThrow("belongs to name 'two'")
    await expect(repo.persist(deleted)).rejects.toThrow("belongs to name 'two'")
    expect(log.some(line => line.startsWith('update') || line.startsWith('delete'))).toBe(false)
  })
})

describe('finding', () => {
  test('leaves out the ones deleted softly', async () => {
    const { log, repo } = await world({ softDelete: true, scope: 'none' }, [stored(), stored({ id: 't2', deletedAt: 'gone' })])

    expect((await repo.find()).map(thing => thing.id)).toEqual(['t1'])
    expect(await repo.count()).toBe(1)
    expect(log[0]).toContain('"deletedAt":null')
  })

  test('counts by fields in its scope, leaving out the ones deleted softly', async () => {
    const { log, repo } = await world({ softDelete: true, scope: { field: 'name', current: () => 'one' } })

    await repo.count({}, { by: ['name'] })
    expect(log[0]).toBe('countBy {"and":[{"and":[{},{"name":"one"}]},{"deletedAt":null}]} name')
  })

  test('a page reads one more than its size after the cursor, and counts them all', async () => {
    const rows = ['t1', 't2', 't3', 't4'].map(id => stored({ id }))
    const { log, repo } = await world({ scope: 'none' }, rows)

    const page = await repo.paginate({}, { size: 2, cursor: 't1' })

    expect(page.items.map(thing => thing.id)).toEqual(['t2', 't3'])
    expect(page.nextCursor).toBe('t3')
    expect(page.total).toBe(4)
    expect(log).toContain('find {"and":[{},{"id":{"gt":"t1"}}]} {"limit":3}')
    expect(log).toContain('count {}')
  })

  test('newest first, it reads back from the cursor, by id from the newest', async () => {
    const rows = ['t1', 't2', 't3', 't4'].map(id => stored({ id }))
    const { log, repo } = await world({ scope: 'none' }, rows)

    await repo.paginate({}, { size: 2, cursor: 't4' }, { newestFirst: true })

    expect(log).toContain('find {"and":[{},{"id":{"lt":"t4"}}]} {"limit":3,"orderBy":[{"field":"id","direction":"desc"}]}')
    expect(log).toContain('count {}')
  })
})
