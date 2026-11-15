import { describe }           from 'bun:test'
import { expect }             from 'bun:test'
import { test }               from 'bun:test'
// --------------------------------------------------------
import { MemoryTransactions } from './memory-transactions'

describe('MemoryTransactions', () => {
  test('says whether it runs in a transaction', async () => {
    const transactions = new MemoryTransactions()

    expect(transactions.inTransaction).toBe(false)
    expect(await transactions.run(() => transactions.inTransaction)).toBe(true)
  })

  test('runs afterCommit once it commits, at once outside one, never if it rolls back', async () => {
    const transactions = new MemoryTransactions()
    const ran: string[] = []

    await transactions.run(() => {
      transactions.afterCommit(() => ran.push('committed'))
      ran.push('body')
    })
    await transactions.run(() => {
      transactions.afterCommit(() => ran.push('rolled back'))
      throw new Error('fails')
    }).catch(() => {})
    transactions.afterCommit(() => ran.push('outside'))

    expect(ran).toEqual(['body', 'committed', 'outside'])
  })

  test('a transaction joined runs in the one in progress, and its failure caught spoils nothing', async () => {
    const transactions = new MemoryTransactions()
    const ran: string[] = []

    await transactions.run(async () => {
      transactions.afterCommit(() => ran.push('committed'))
      await transactions.run(() => Promise.reject(new Error('inner'))).catch(() => {})
    })

    expect(ran).toEqual(['committed'])
  })

  test('refuses a call that comes after its transaction ended, instead of running it outside', async () => {
    const transactions = new MemoryTransactions()
    const ran: string[] = []
    let late: Promise<unknown> = Promise.resolve()

    await transactions.run(() => {
      late = Bun.sleep(10).then(() => transactions.afterCommit(() => ran.push('late')))
    })

    await expect(late).rejects.toThrow('belongs to a transaction that has ended')
    expect(ran).toEqual([])
  })

  test('runs one transaction at a time: the next waits for the one in progress to end', async () => {
    const transactions = new MemoryTransactions()
    const order: string[] = []

    await Promise.all([
      transactions.run(async () => {
        order.push('first starts')
        await Bun.sleep(10)
        order.push('first ends')
      }),
      transactions.run(() => void order.push('second')),
    ])

    expect(order).toEqual(['first starts', 'first ends', 'second'])
  })
})
