import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
// --------------------------------------------------------
import { MemoryDatabase } from '../../../adapters/database/memory/memory-database/memory-database'
import { Module }         from '../../../domain/module/module/module'
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

  test('refuses a module of another context, and one under another name', () => {
    class Of_Module extends Module {}
    class Of_Context extends BoundedContext {
      constructor(base: ContextBase, modules: Record<string, Module>) {
        super('shop', base, modules)
      }
    }
    const base = new ContextBase({ name: 'shop', platform, database: new MemoryDatabase() })
    const billing = new ContextBase({ name: 'billing', platform, database: new MemoryDatabase() })
    const order = new Of_Module('order', base.useCaseRunner)

    expect(() => new Of_Context(base, { order })).not.toThrow()
    expect(() => new Of_Context(base, { invoice: new Of_Module('invoice', billing.useCaseRunner) })).toThrow('The context shop: invoice is a module of the context billing: a context holds only its own modules')
    expect(() => new Of_Context(base, { sale: order })).toThrow('The context shop: order is given as sale: each module goes under its own name, order')
  })
})
