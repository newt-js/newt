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
import { Feature }       from './feature'

const Sent = defineEvent('campaigns[campaign].sent', z.object({ id: z.string() }))

const bus: EventBus = { publish: () => {}, subscribe: () => () => {} }

class Template_Module extends Module {
  constructor(runner: UseCaseRunner) {
    super('campaigns[template]', runner)
  }

  @UseCase()
  async get(id: string): Promise<{ id: string }> {
    return { id }
  }
}

class Campaign_Module extends Module {
  readonly events = eventsOf(bus, { sent: Sent })

  constructor(runner: UseCaseRunner, private readonly deps: { template: Template_Module }) {
    super('campaigns[campaign]', runner, deps)
  }

  @UseCase()
  async send(template: string): Promise<string> {
    return (await this.deps.template.get(template)).id
  }
}

/** A feature as a context writes one. */
class Campaigns_Feature extends Feature {
  static initialize(runner = new UseCaseRunner({ context: 'engagement' })): Campaigns_Feature {
    const template = new Template_Module(runner)
    const campaign = new Campaign_Module(runner, { template })
    return new Campaigns_Feature({ useCaseRunner: runner }, { campaign, template })
  }

  public readonly campaign: Campaign_Module
  public readonly template: Template_Module

  private constructor(
    base: { useCaseRunner: UseCaseRunner },
    modules: {
      campaign: Campaign_Module,
      template: Template_Module,
    },
  ) {
    super('campaigns', base, modules)
    this.campaign = modules.campaign
    this.template = modules.template
  }
}

describe('Feature', () => {
  test('holds its modules whole, each by its name', async () => {
    const campaigns = Campaigns_Feature.initialize()

    expect(await campaigns.campaign.send('t1')).toBe('t1')
    expect(await campaigns.template.get('t2')).toEqual({ id: 't2' })
    expect(campaigns.campaign.events.sent.name).toBe('campaigns[campaign].sent')
  })

  test('tells its name and its context, and is told apart from any other object', () => {
    const campaigns = Campaigns_Feature.initialize()

    expect(isFeature(campaigns)).toBe(true)
    expect(featureOf(campaigns)).toEqual({ name: 'campaigns', context: 'engagement' })
    expect(isFeature({ campaign: {} })).toBe(false)
  })

  test('is registered in its context, with its modules', () => {
    const runner = new UseCaseRunner({ context: 'engagement' })
    Campaigns_Feature.initialize(runner)

    expect(runner.registry.registeredFeatures).toEqual([{ name: 'campaigns', modules: ['campaign', 'template'] }])
  })

  test('refuses a name not in camelCase, a module of another feature or context, and one under another name', () => {
    const runner = new UseCaseRunner()
    const template = new Template_Module(runner)
    class Of_Feature extends Feature {}
    const base = { useCaseRunner: runner }

    expect(() => new Of_Feature('Campaigns', base, {})).toThrow("'Campaigns' cannot name a feature")
    expect(() => new Of_Feature('sales-orders', base, {})).toThrow("'sales-orders' cannot name a feature")
    expect(() => new Of_Feature('emails', base, { template })).toThrow('The feature emails: campaigns[template] is a module of the feature campaigns: a feature holds only its own modules, emails[<module>]')
    expect(() => new Of_Feature('campaigns', { useCaseRunner: new UseCaseRunner({ context: 'billing' }) }, { template })).toThrow("campaigns[template] is a module of another context than billing's")
    expect(() => new Of_Feature('campaigns', base, { layout: template })).toThrow('The feature campaigns: campaigns[template] is given as layout: each module goes under its own name, template')
  })
})
