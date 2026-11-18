import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
// --------------------------------------------------------
import { MemoryDatabase } from '../../../adapters/database/memory/memory-database/memory-database'
import { Module }         from '../../../domain/module/module/module'
import { UseCase }        from '../../../domain/use-case/use-case/use-case'
import { MemoryCluster }  from '../../cluster/memory-cluster/memory-cluster'
import { ContextBase }    from '../../context/context-base/context-base'
import { Platform }       from '../../platform/platform/platform'
import { describeModule } from './describe-module'

const platform = new Platform({ cluster: new MemoryCluster() })

class Report_Module extends Module {
  readonly nightly

  constructor(base: ContextBase, deps: object) {
    super('report', base.useCaseRunner, deps)
    this.nightly = base.schedules.define('report.nightly', '0 3 * * *')
  }

  @UseCase()
  async build() {}

  @UseCase({ retryOnConflict: false })
  async send() {}
}

describe('describeModule', () => {
  test('tells a module by its id, its use cases, the events it tells with their schedule, and its deps', () => {
    const shop = new ContextBase({ name: 'shop', platform, database: new MemoryDatabase() })
    new Report_Module(shop, { mailer: { send: async () => {} } })
    const { registry } = shop.useCaseRunner

    expect(describeModule(registry, registry.registeredModules[0]!, new Map())).toEqual({
      id: 'shop/report',
      context: 'shop',
      name: 'report',
      feature: null,
      className: 'Report_Module',
      exposes: { useCases: [], events: [] },
      useCases: [
        { id: 'shop/report.build', name: 'report.build', retryOnConflict: true },
        { id: 'shop/report.send', name: 'report.send', retryOnConflict: false },
      ],
      events: [{ id: 'shop/report.nightly', name: 'report.nightly', schedule: { cron: '0 3 * * *' } }],
      deps: [{ name: 'mailer', kind: 'port', target: null }],
    })
  })

  test('tells the feature of a module of a feature, and what it exposes', () => {
    class Template_Module extends Module {
      readonly exposes = { useCases: ['get'], events: [] } as const
      constructor(base: ContextBase) {
        super('campaigns[template]', base.useCaseRunner)
      }

      @UseCase()
      async get() {}
    }
    const engagement = new ContextBase({ name: 'engagement', platform, database: new MemoryDatabase() })
    new Template_Module(engagement)
    const { registry } = engagement.useCaseRunner

    const described = describeModule(registry, registry.registeredModules[0]!, new Map())

    expect(described).toMatchObject({ id: 'engagement/campaigns[template]', name: 'campaigns[template]', feature: 'campaigns', exposes: { useCases: ['get'], events: [] } })
    expect(described.useCases).toEqual([{ id: 'engagement/campaigns[template].get', name: 'campaigns[template].get', retryOnConflict: true }])
  })
})
