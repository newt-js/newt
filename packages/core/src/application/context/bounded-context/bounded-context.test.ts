import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
// --------------------------------------------------------
import { MemoryDatabase } from '../../../adapters/database/memory/memory-database/memory-database'
import { Feature }        from '../../../domain/feature/feature/feature'
import { MemoryCluster }  from '../../cluster/memory-cluster/memory-cluster'
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

  test('refuses a feature of another context, and one under another name', () => {
    class Of_Feature extends Feature {}
    class Of_Context extends BoundedContext {
      constructor(base: ContextBase, features: Record<string, Feature>) {
        super('shop', base, features)
      }
    }
    const base = new ContextBase({ name: 'shop', platform, database: new MemoryDatabase() })
    const billing = new ContextBase({ name: 'billing', platform, database: new MemoryDatabase() })
    const orders = new Of_Feature('orders', base, {})

    expect(() => new Of_Context(base, { orders })).not.toThrow()
    expect(() => new Of_Context(base, { invoices: new Of_Feature('invoices', billing, {}) })).toThrow('The context shop: invoices is a feature of the context billing: a context holds only its own features')
    expect(() => new Of_Context(base, { sales: orders })).toThrow('The context shop: orders is given as sales: each feature goes under its own name, orders')
  })
})
