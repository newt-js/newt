import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { MemoryDatabase }  from '../../../adapters/database/memory/memory-database/memory-database'
import { Feature }         from '../../../domain/feature/feature/feature'
import { Module }          from '../../../domain/module/module/module'
import { UseCase }         from '../../../domain/use-case/use-case/use-case'
import { MemoryCluster }   from '../../cluster/memory-cluster/memory-cluster'
import { ContextBase }     from '../../context/context-base/context-base'
import { Platform }        from '../../platform/platform/platform'
import { describeContext } from './describe-context'

const platform = new Platform({ cluster: new MemoryCluster() })

class Tax_Module extends Module {
  constructor(base: ContextBase) {
    super('billing[tax]', base.useCaseRunner)
  }

  @UseCase()
  async rate() {}
}

class Order_Module extends Module {
  constructor(base: ContextBase, deps: object) {
    super('sales[order]', base.useCaseRunner, deps)
  }

  @UseCase()
  async place() {}
}

describe('describeContext', () => {
  test('lists its modules, the other contexts they use and the subscriptions to its events', () => {
    const shop = new ContextBase({ name: 'shop', platform, database: new MemoryDatabase() })
    const billing = new ContextBase({ name: 'billing', platform, database: new MemoryDatabase() })
    const tax = new Tax_Module(billing)
    new Order_Module(shop, { tax, self: new Tax_Module(shop) })
    shop.bus.subscribe('order.placed', () => {}, { strategy: 'handler', queue: 'billing[invoice].open_on_order.placed', attempts: 3 })

    const described = describeContext(shop.useCaseRunner.registry, new Map())

    expect(described.name).toBe('shop')
    expect(described.modules.map(module => module.id)).toEqual(['shop/billing[tax]', 'shop/sales[order]'])
    expect(described.uses).toEqual(['billing'])
    expect(described.subscriptions).toEqual([
      { event: 'shop/order.placed', strategy: 'handler', queue: 'billing[invoice].open_on_order.placed', handler: 'billing[invoice].open', attempts: 3, filtered: false },
    ])
  })

  test("a handler of a module of a feature is its queue's use case", () => {
    const shop = new ContextBase({ name: 'shop', platform, database: new MemoryDatabase() })
    shop.bus.subscribe('sales[order].placed', () => {}, { strategy: 'handler', queue: 'billing[invoice].open_on_sales[order].placed' })

    const [subscription] = describeContext(shop.useCaseRunner.registry, new Map()).subscriptions

    expect(subscription?.handler).toBe('billing[invoice].open')
  })

  test('lists its features and the modules of each, a feature with no modules yet too', () => {
    class Template_Module extends Module {
      constructor(base: ContextBase, name = 'campaigns[template]') {
        super(name, base.useCaseRunner)
      }
    }
    const engagement = new ContextBase({ name: 'engagement', platform, database: new MemoryDatabase() })
    class Of_Feature extends Feature {}
    const template = new Template_Module(engagement)
    const log = new Template_Module(engagement, 'campaigns[log]')
    new Template_Module(engagement, 'contacts[contact]')
    new Of_Feature('campaigns', engagement, { template, log })
    new Of_Feature('mailings', engagement, {})

    const described = describeContext(engagement.useCaseRunner.registry, new Map())

    expect(described.features).toEqual([
      { id: 'engagement/campaigns', name: 'campaigns', modules: ['engagement/campaigns[template]', 'engagement/campaigns[log]'] },
      { id: 'engagement/contacts', name: 'contacts', modules: ['engagement/contacts[contact]'] },
      { id: 'engagement/mailings', name: 'mailings', modules: [] },
    ])
  })
})
