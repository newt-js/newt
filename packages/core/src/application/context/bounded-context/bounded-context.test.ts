import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
// --------------------------------------------------------
import { MemoryCluster }  from '../../../adapters/cluster/memory/memory-cluster/memory-cluster'
import { MemoryDatabase } from '../../../adapters/database/memory/memory-database/memory-database'
import { Platform }       from '../../platform/platform/platform'
import { ContextBase }    from '../context-base/context-base'
import { BoundedContext } from './bounded-context'

const platform = new Platform({ cluster: new MemoryCluster() })

class Shop extends BoundedContext {
  constructor(base: ContextBase) {
    super('shop', base)
  }
}

describe('BoundedContext', () => {
  test('starts its worker and its schedules, and stops both before closing its database', async () => {
    const log: string[] = []
    const database = new MemoryDatabase()
    database.close = async () => void log.push('database closed')
    const base = new ContextBase({ name: 'shop', platform, database })
    base.worker.start = () => void log.push('worker started')
    base.worker.stop = async () => {
      await Bun.sleep(5)
      log.push('worker stopped')
    }
    base.schedules.start = () => void log.push('schedules started')
    base.schedules.stop = async () => void log.push('schedules stopped')
    const shop = new Shop(base)

    shop.start()
    await shop.stop()

    expect(log).toEqual(['worker started', 'schedules started', 'schedules stopped', 'worker stopped', 'database closed'])
  })
})
