import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
import { z }             from 'zod'
// --------------------------------------------------------
import type { EventBus } from '../../events/bus/event-bus'
import { defineEvent }   from '../../events/define-event/define-event'
import { eventsOf }      from '../../events/events-of/events-of'
import { Module }        from '../../module/module/module'
import { UseCaseRunner } from '../../use-case/use-case-runner/use-case-runner'
import { UseCase }       from '../../use-case/use-case/use-case'
import { featureOf }     from '../is-feature/is-feature'
import { isFeature }     from '../is-feature/is-feature'
import { defineFeature } from './define-feature'

const Sent = defineEvent('campaigns[campaign].sent', z.object({ id: z.string() }))

const bus: EventBus = { publish: () => {}, subscribe: () => () => {} }

class Template_Module extends Module {
  readonly exposes = { useCases: ['get'] } as const

  constructor(runner: UseCaseRunner) {
    super('campaigns[template]', runner)
  }

  @UseCase()
  async get(id: string): Promise<{ id: string }> {
    return { id }
  }

  @UseCase()
  async archive(): Promise<void> {}
}

class Campaign_Module extends Module {
  readonly exposes = { useCases: ['send'], events: ['sent'] } as const
  readonly events = eventsOf(bus, { sent: Sent })

  constructor(runner: UseCaseRunner, private readonly deps: { template: Template_Module }) {
    super('campaigns[campaign]', runner, deps)
  }

  @UseCase()
  async send(template: string): Promise<string> {
    await this.deps.template.archive()
    return (await this.deps.template.get(template)).id
  }
}

class Log_Module extends Module {
  constructor(runner: UseCaseRunner) {
    super('campaigns[log]', runner)
  }
}

/** A feature's entry point, as a context writes one. */
function campaignsFeature(runner = new UseCaseRunner({ context: 'engagement' })) {
  const template = new Template_Module(runner)
  const campaign = new Campaign_Module(runner, { template })
  new Log_Module(runner)
  return defineFeature('campaigns', { useCaseRunner: runner }, { campaign, template })
}

describe('defineFeature', () => {
  test('shows the modules it is given, each with what it exposes', async () => {
    const campaigns = campaignsFeature()

    expect(Object.keys(campaigns).sort()).toEqual(['campaign', 'template'])
    expect(await campaigns.campaign.send('t1')).toBe('t1')
    expect(await campaigns.template.get('t2')).toEqual({ id: 't2' })
    expect(campaigns.campaign.events.sent.name).toBe('campaigns[campaign].sent')
  })

  test('keeps out, in its type too, the modules it is not given and what a module does not expose', () => {
    const campaigns = campaignsFeature()

    // @ts-expect-error log is the feature's own
    expect(campaigns.log).toBeUndefined()
    // @ts-expect-error archive is not exposed
    expect(campaigns.template.archive).toBeUndefined()
  })

  test('tells its name and its context, and is told apart from any other object', () => {
    const campaigns = campaignsFeature()

    expect(isFeature(campaigns)).toBe(true)
    expect(featureOf(campaigns)).toEqual({ name: 'campaigns', context: 'engagement' })
    expect(isFeature({ campaign: {} })).toBe(false)
  })

  test("is registered in its context, with the modules it shows", () => {
    const runner = new UseCaseRunner({ context: 'engagement' })
    campaignsFeature(runner)

    expect(runner.registry.registeredFeatures).toEqual([{ name: 'campaigns', modules: ['campaign', 'template'] }])
  })

  test('that shows no module is still a feature of its context, and registered', () => {
    const runner = new UseCaseRunner({ context: 'engagement' })
    new Log_Module(runner)

    const audit = defineFeature('audit', { useCaseRunner: runner }, {})

    expect(featureOf(audit)).toEqual({ name: 'audit', context: 'engagement' })
    expect(runner.registry.registeredFeatures).toEqual([{ name: 'audit', modules: [] }])
  })

  test('refuses in its types a module that exposes a name it has not, or names not written as const', () => {
    const runner = new UseCaseRunner()
    class Typo_Module extends Module {
      readonly exposes = { useCases: ['gett'] } as const
      constructor() {
        super('campaigns[typo]', runner)
      }

      @UseCase()
      async get() {}
    }
    class Loose_Module extends Module {
      readonly exposes = { useCases: ['get'] }
      constructor() {
        super('campaigns[loose]', runner)
      }

      @UseCase()
      async get() {}
    }

    // @ts-expect-error gett is none of its use cases
    expect(() => defineFeature('campaigns', { useCaseRunner: runner }, { typo: new Typo_Module() })).toThrow('exposes gett')
    // @ts-expect-error its names are not as const
    expect(defineFeature('campaigns', { useCaseRunner: runner }, { loose: new Loose_Module() })).toBeDefined()
  })

  test('keeps out of its contract, in its type too, the modules it keeps internal', () => {
    const runner = new UseCaseRunner({ context: 'engagement' })
    const template = new Template_Module(runner)
    const log = new Log_Module(runner)

    const campaigns = defineFeature('campaigns', { useCaseRunner: runner }, { template, log }, { internal: ['log'] })

    expect(Object.keys(campaigns)).toEqual(['template'])
    // @ts-expect-error log is internal
    expect(campaigns.log).toBeUndefined()
    expect(runner.registry.registeredFeatures).toEqual([{ name: 'campaigns', modules: ['template'] }])
    // @ts-expect-error tag is none of its modules
    expect(() => defineFeature('campaigns', { useCaseRunner: runner }, { template }, { internal: ['tag'] })).toThrow("defineFeature('campaigns'): it keeps tag internal, which are none of its modules: template")
  })

  test('cannot be changed', () => {
    const campaigns = campaignsFeature() as unknown as Record<string, unknown>

    expect(() => { campaigns.log = {} }).toThrow()
  })

  test('refuses a name not in camelCase, and a module of another feature or by another name', () => {
    const runner = new UseCaseRunner()
    const template = new Template_Module(runner)

    const base = { useCaseRunner: runner }

    expect(() => defineFeature('Campaigns', base, {})).toThrow("'Campaigns' cannot name a feature")
    expect(() => defineFeature('sales-orders', base, {})).toThrow("'sales-orders' cannot name a feature")
    expect(() => defineFeature('emails', base, { template })).toThrow("defineFeature('emails'): template is campaigns[template], a module of the feature campaigns: a feature shows only its own modules, emails[<module>]; or is this feature named campaigns? defineFeature('campaigns', …)")
    expect(() => defineFeature('campaigns', base, { model: template })).toThrow("defineFeature('campaigns'): campaigns[template] is shown as model: show it as template")
    expect(() => defineFeature('campaigns', { useCaseRunner: new UseCaseRunner({ context: 'billing' }) }, { template })).toThrow("campaigns[template] is a module of another context than billing's")
  })
})
