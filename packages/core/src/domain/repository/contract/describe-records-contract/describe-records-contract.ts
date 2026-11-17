import { afterEach }           from 'bun:test'
import { beforeEach }          from 'bun:test'
import { describe }            from 'bun:test'
import { expect }              from 'bun:test'
import { test }                from 'bun:test'
// --------------------------------------------------------
import { ConcurrencyConflict } from '../../../errors/concurrency-conflict/concurrency-conflict'
import { StaleVersion }        from '../../../errors/stale-version/stale-version'
import { TextWithNul }         from '../../text-with-nul/text-with-nul'
import { GuardTimeout }        from '../../transactions/guard-timeout/guard-timeout'
import { TransactionSpoiled }  from '../../transactions/transaction-spoiled/transaction-spoiled'
import { pause }               from '../pause/pause'
import type { RecordsFixture } from '../records-fixture'
import type { RecordsWorld }   from '../records-fixture'
import { row }                 from '../row/row'

export function describeRecordsContract(name: string, fixture: RecordsFixture): void {
  describe(`${name} keeps the Records and Transactions contract`, () => {
    let world: RecordsWorld

    beforeEach(async () => {
      world = await fixture.open()
    })

    afterEach(() => fixture.close?.(world))

    test('inserts a row at its first version, and finds it as it was given', async () => {
      await world.records.insert(row('a', { tag: 'x' }))

      expect(await world.records.find()).toEqual([{ id: 'a', version: 1, name: 'a', size: 1, tag: 'x' }])
    })

    test('finds what meets the criteria, by id unless told otherwise, up to a limit', async () => {
      for (const [id, size] of [['c', 3], ['a', 1], ['b', 2]] as const) {
        await world.records.insert(row(id, { size }))
      }

      expect((await world.records.find()).map(each => each.id)).toEqual(['a', 'b', 'c'])
      expect((await world.records.find({ size: { gte: 2 } })).map(each => each.id)).toEqual(['b', 'c'])
      expect((await world.records.find({}, { orderBy: [{ field: 'size', direction: 'desc' }], limit: 2 })).map(each => each.id)).toEqual(['c', 'b'])
    })

    test('counts what meets the criteria, all of it or by the values of some fields', async () => {
      await world.records.insert(row('a', { tag: 'x' }))
      await world.records.insert(row('b', { tag: 'y' }))
      await world.records.insert(row('c', { tag: 'x' }))

      expect(await world.records.count()).toBe(3)
      expect(await world.records.count({ tag: 'x' })).toBe(2)
      expect(await world.records.countBy({}, ['tag'])).toEqual([{ tag: 'x', count: 2 }, { tag: 'y', count: 1 }])
    })

    test('refuses a limit that is not a whole number, 0 or more, and a count by no fields', async () => {
      await world.records.insert(row('a'))
      await world.records.insert(row('b'))

      await expect(world.records.find({}, { limit: -1 })).rejects.toThrow('A limit is a whole number, 0 or more')
      await expect(world.records.find({}, { limit: 1.5 })).rejects.toThrow('A limit is a whole number, 0 or more')
      await expect(world.records.countBy({}, [])).rejects.toThrow('A count by fields names at least one')
    })

    test('changes a row at the version it was read, one version on', async () => {
      await world.records.insert(row('a'))

      await world.records.update('a', 1, { name: 'renamed' })

      expect(await world.records.find()).toEqual([{ id: 'a', version: 2, name: 'renamed', size: 1, tag: null }])
    })

    test('leaves a field it is given no value for as it was', async () => {
      await world.records.insert(row('a', { tag: 'x' }))

      await world.records.update('a', 1, { name: 'renamed', tag: undefined } as never)

      expect(await world.records.find()).toEqual([{ id: 'a', version: 2, name: 'renamed', size: 1, tag: 'x' }])
      expect(await world.records.count({ tag: null })).toBe(0)
    })

    test('refuses to change or delete a row at another version, or one not there', async () => {
      await world.records.insert(row('a'))

      await expect(world.records.update('a', 7, { name: 'b' })).rejects.toBeInstanceOf(StaleVersion)
      await expect(world.records.delete('a', 7)).rejects.toBeInstanceOf(StaleVersion)
      await expect(world.records.update('missing', 1, { name: 'b' })).rejects.toBeInstanceOf(StaleVersion)
      expect(await world.records.count()).toBe(1)
    })

    test('refuses text with NUL, which no database keeps, and finds nothing by it', async () => {
      await world.records.insert(row('a'))

      await expect(world.records.insert(row('b', { name: 'b\u0000c' }))).rejects.toBeInstanceOf(TextWithNul)
      await expect(world.records.update('a', 1, { tag: 'x\u0000' })).rejects.toBeInstanceOf(TextWithNul)
      expect(await world.records.find({ name: 'a\u0000' })).toEqual([])
      expect(await world.records.count({ name: { ne: 'a\u0000' } })).toBe(1)
    })

    test('orders by code point, as every database of newt does: case and accents apart', async () => {
      for (const [id, name] of [['a', 'b'], ['b', 'Á'], ['c', 'B'], ['d', 'á'], ['e', 'a'], ['f', 'A']] as const) {
        await world.records.insert(row(id, { name }))
      }

      expect((await world.records.find({}, { orderBy: [{ field: 'name' }] })).map(each => each.name)).toEqual(['A', 'B', 'a', 'b', 'Á', 'á'])
      expect((await world.records.find({ name: { gt: 'b' } })).map(each => each.name).sort()).toEqual(['Á', 'á'])
    })

    test('counts by fields in their order, numbers as numbers', async () => {
      for (const [id, size] of [['a', 10], ['b', 9], ['c', 10]] as const) {
        await world.records.insert(row(id, { size }))
      }

      expect(await world.records.countBy({}, ['size'])).toEqual([{ size: 9, count: 1 }, { size: 10, count: 2 }])
    })

    test('refuses a row whose id is taken', async () => {
      await world.records.insert(row('a'))

      await expect(world.records.insert(row('a'))).rejects.toBeInstanceOf(ConcurrencyConflict)
    })

    test('deletes a row at its version, and many by criteria, saying how many', async () => {
      for (const id of ['a', 'b', 'c']) {
        await world.records.insert(row(id, { tag: id === 'a' ? null : 'x' }))
      }

      await world.records.delete('a', 1)

      expect(await world.records.deleteMany({ tag: 'x' })).toBe(2)
      expect(await world.records.count()).toBe(0)
    })

    test('undoes what a transaction wrote when it rolls back, latest first, and runs afterRollback only then', async () => {
      await world.records.insert(row('a'))
      const undone: string[] = []

      await expect(world.transactions.run(async () => {
        world.transactions.afterRollback(() => undone.push('first'))
        await world.records.update('a', 1, { name: 'changed' })
        await world.records.insert(row('b'))
        world.transactions.afterRollback(() => undone.push('second'))
        throw new Error('later step failed')
      })).rejects.toThrow('later step failed')
      await world.transactions.run(() => world.transactions.afterRollback(() => undone.push('never')))

      expect(await world.records.find()).toEqual([{ id: 'a', version: 1, name: 'a', size: 1, tag: null }])
      expect(undone).toEqual(['second', 'first'])
    })

    test('a failing afterRollback leaves the others to run, and the transaction failing for its own error', async () => {
      await world.records.insert(row('a'))
      const undone: string[] = []

      await expect(world.transactions.run(async () => {
        world.transactions.afterRollback(() => undone.push('first'))
        await world.records.update('a', 1, { name: 'changed' })
        world.transactions.afterRollback(() => {
          throw new Error('a callback broke')
        })
        throw new Error('later step failed')
      })).rejects.toThrow('later step failed')

      expect(undone).toEqual(['first'])
      expect(await world.records.find()).toEqual([{ id: 'a', version: 1, name: 'a', size: 1, tag: null }])
    })

    test('reads outside a transaction see only what is committed', async () => {
      await world.records.insert(row('a'))
      let wrote = () => {}
      const written = new Promise<void>(resolve => {
        wrote = resolve
      })
      let letGo = () => {}
      const held = new Promise<void>(resolve => {
        letGo = resolve
      })
      const writing = world.transactions.run(async () => {
        await world.records.update('a', 1, { name: 'uncommitted' })
        await world.records.insert(row('b'))
        wrote()
        await held
      })
      await written

      expect(await world.records.find()).toEqual([{ id: 'a', version: 1, name: 'a', size: 1, tag: null }])
      expect(await world.records.count()).toBe(1)
      letGo()
      await writing
      expect((await world.records.find()).map(each => [each.id, each.version, each.name])).toEqual([['a', 2, 'uncommitted'], ['b', 1, 'b']])
    })

    test('a rollback never undoes a write another transaction committed', async () => {
      await world.records.insert(row('a'))
      let wrote = () => {}
      const written = new Promise<void>(resolve => {
        wrote = resolve
      })
      let letGo = () => {}
      const held = new Promise<void>(resolve => {
        letGo = resolve
      })
      const failing = world.transactions.run(async () => {
        await world.records.update('a', 1, { name: 'rolled back' })
        wrote()
        await held
        throw new Error('later step failed')
      })
      await written
      const committing = world.records.update('a', 1, { name: 'committed' })
      await pause()
      letGo()

      await expect(failing).rejects.toThrow('later step failed')
      await committing
      expect(await world.records.find()).toEqual([{ id: 'a', version: 2, name: 'committed', size: 1, tag: null }])
      await world.records.update('a', 2, { size: 2 })
      expect(await world.records.count({ size: 2 })).toBe(1)
    })

    test('a call that comes after its transaction ended fails, instead of running outside it', async () => {
      let late: Promise<unknown> = Promise.resolve()

      await world.transactions.run(async () => {
        late = pause(30).then(() => world.records.insert(row('late')))
      })

      await expect(late).rejects.toThrow('belongs to a transaction that has ended')
      expect(await world.records.count()).toBe(0)
    })

    test('a branch still running after another threw cannot write once its transaction rolled back', async () => {
      let late: Promise<unknown> = Promise.resolve()

      await expect(world.transactions.run(() => {
        late = pause(30).then(() => world.records.insert(row('late')))
        return Promise.all([late, Promise.reject(new Error('a branch failed'))])
      })).rejects.toThrow('a branch failed')

      await expect(late).rejects.toThrow('belongs to a transaction that has ended')
      expect(await world.records.count()).toBe(0)
    })

    test('a save joined to a transaction runs in it, and failing spoils it, even if its error was caught', async () => {
      const spoiled = world.transactions.run(async () => {
        await world.records.insert(row('a'))
        await world.transactions.save(() => Promise.reject(new Error('conflict'))).catch(() => {})
      })

      await expect(spoiled).rejects.toBeInstanceOf(TransactionSpoiled)
      expect(await world.records.count()).toBe(0)
    })

    test('a save tells the modules its transaction saved so far, the same for every save in it', async () => {
      const seen: Set<string>[] = []

      await world.transactions.run(async () => {
        await world.transactions.save(async save => {
          save.modules.add('shop.brands')
          seen.push(save.modules)
        })
        await world.transactions.save(async save => void seen.push(save.modules))
      })

      expect(seen[0]).toBe(seen[1]!)
      expect([...seen[1]!]).toEqual(['shop.brands'])
    })

    test('a save tells the records it read', async () => {
      let read: string[] = []

      await world.transactions.save(async save => {
        await world.records.find()
        read = [...save.read]
      })

      expect(read).toHaveLength(1)
    })

    test('a guard holds its keys until its transaction ends: another guarding one waits', async () => {
      const order: string[] = []
      let letGo = () => {}
      const held = new Promise<void>(resolve => {
        letGo = resolve
      })

      const first = world.transactions.run(async () => {
        await world.transactions.guard(['stock:p1'])
        order.push('first holds')
        await held
        order.push('first ends')
      })
      await pause()
      const second = world.transactions.run(async () => {
        await world.transactions.guard(['stock:p1', 'stock:p2'])
        order.push('second holds')
      })
      await pause()
      letGo()
      await Promise.all([first, second])

      expect(order).toEqual(['first holds', 'first ends', 'second holds'])
    })

    test('a guard waits no longer than it is told', async () => {
      if (fixture.serial) {
        return
      }
      let letGo = () => {}
      const held = new Promise<void>(resolve => {
        letGo = resolve
      })
      const first = world.transactions.run(async () => {
        await world.transactions.guard(['k'])
        await held
      })
      await pause()

      await expect(world.transactions.run(() => world.transactions.guard(['k'], { waitMs: 20 }))).rejects.toBeInstanceOf(GuardTimeout)
      letGo()
      await first
    })

    test('a guard is taken inside a transaction', async () => {
      await expect(world.transactions.guard(['k'])).rejects.toThrow()
    })
  })
}
