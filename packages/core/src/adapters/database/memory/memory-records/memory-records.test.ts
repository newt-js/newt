import { describe }                from 'bun:test'
import { expect }                  from 'bun:test'
import { test }                    from 'bun:test'
// --------------------------------------------------------
import { describeRecordsContract } from '../../../../domain/repository/contract/describe-records-contract/describe-records-contract'
import type { ContractRow }        from '../../../../domain/repository/contract/records-fixture'
import { MemoryTransactions }      from '../memory-transactions/memory-transactions'
import { MemoryRecords }           from './memory-records'

describeRecordsContract('MemoryRecords', {
  serial: true,
  open: async () => {
    const transactions = new MemoryTransactions()
    return { transactions, records: new MemoryRecords<ContractRow>('things', transactions) }
  },
})

describe('MemoryRecords', () => {
  test('starts with the rows it is given, and hands out copies', async () => {
    const records = new MemoryRecords<ContractRow>('things', new MemoryTransactions(), [{ id: 'a', version: 3, name: 'a', size: 1, tag: null }])

    const [found] = await records.find()
    found!.name = 'changed outside'

    expect(await records.find()).toEqual([{ id: 'a', version: 3, name: 'a', size: 1, tag: null }])
  })

  test('says it read by its name', async () => {
    const transactions = new MemoryTransactions()
    const records = new MemoryRecords<ContractRow>('things', transactions)

    const read = await transactions.save(async save => {
      await records.count()
      return [...save.read]
    })

    expect(read).toEqual(['things'])
  })
})
