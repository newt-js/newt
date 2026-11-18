import { describe }                from 'bun:test'
import { expect }                  from 'bun:test'
import { test }                    from 'bun:test'
// --------------------------------------------------------
import { describeInboxContract }   from '../../../../application/database/contract/describe-inbox-contract/describe-inbox-contract'
import { describeRecordsContract } from '../../../../domain/repository/contract/describe-records-contract/describe-records-contract'
import type { ContractRow }        from '../../../../domain/repository/contract/records-fixture'
import { MemoryDatabase }          from './memory-database'

describeRecordsContract('MemoryDatabase', {
  serial: true,
  open: async () => {
    const database = new MemoryDatabase()
    return { transactions: database, records: database.records<ContractRow>('things') }
  },
})

describeInboxContract('MemoryDatabase', { open: async () => new MemoryDatabase() })

describe('MemoryDatabase', () => {
  test('gives the same records each time for one name, and others for another', async () => {
    const database = new MemoryDatabase()
    await database.records<ContractRow>('things').insert({ id: 'a', name: 'a', size: 1, tag: null })

    expect(await database.records<ContractRow>('things').count()).toBe(1)
    expect(await database.records<ContractRow>('others').count()).toBe(0)
  })

  test('rolls back the jobs of its outbox with the rows of its records', async () => {
    const database = new MemoryDatabase()
    const now = new Date().toISOString()

    await database.run(async () => {
      await database.records<ContractRow>('things').insert({ id: 'a', name: 'a', size: 1, tag: null })
      await database.outbox.add([{ id: 'j', queue: 'f[a].b_on_c', event: '{}', status: 'pending', attempts: 0, runAfter: now, lockedBy: null, lockedUntil: null, lastError: null, createdAt: now, updatedAt: now }])
      throw new Error('later step failed')
    }).catch(() => {})

    expect(await database.records<ContractRow>('things').count()).toBe(0)
    expect(await database.outbox.list()).toEqual([])
  })
})
