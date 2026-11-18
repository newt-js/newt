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

    expect(runner.registry.registeredFeatures).toEqual([{ name: 'campaigns', exposed: ['campaign', 'template'] }])
  })

  test('that shows no module is still a feature of its context, and registered', () => {
    const runner = new UseCaseRunner({ context: 'engagement' })
    new Log_Module(runner)

    const audit = defineFeature('audit', { useCaseRunner: runner }, {})

    expect(featureOf(audit)).toEqual({ name: 'audit', context: 'engagement' })
    expect(runner.registry.registeredFeatures).toEqual([{ name: 'audit', exposed: [] }])
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
    expect(() => defineFeature('emails', base, { template })).toThrow('The feature emails shows campaigns[template] as template')
    expect(() => defineFeature('campaigns', base, { model: template })).toThrow('The feature campaigns shows campaigns[template] as model')
    expect(() => defineFeature('campaigns', { useCaseRunner: new UseCaseRunner({ context: 'billing' }) }, { template })).toThrow("campaigns[template] is a module of another context than billing's")
  })
})
