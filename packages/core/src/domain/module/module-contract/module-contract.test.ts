import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
import { z }             from 'zod'
// --------------------------------------------------------
import type { EventBus } from '../../events/bus/event-bus'
import { defineEvent }   from '../../events/define-event/define-event'
import { eventsOf }      from '../../events/events-of/events-of'
import { UseCaseRunner } from '../../use-case/use-case-runner/use-case-runner'
import { UseCase }       from '../../use-case/use-case/use-case'
import { Module }        from '../module/module'
import { contractOf }    from './module-contract'

const Created = defineEvent('campaigns[template].created', z.object({ id: z.string() }))
const Archived = defineEvent('campaigns[template].archived', z.object({ id: z.string() }))

const bus: EventBus = { publish: () => {}, subscribe: () => () => {} }

class Template_Module extends Module {
  readonly exposes = { useCases: ['get', 'create'], events: ['created'] } as const
  readonly events = eventsOf(bus, { created: Created, archived: Archived })

  constructor(runner = new UseCaseRunner()) {
    super('campaigns[template]', runner)
  }

  @UseCase()
  async get(id: string): Promise<string> {
    return `${this.name} ${id}`
  }

  @UseCase()
  async create(): Promise<void> {}

  @UseCase()
  async archive(): Promise<void> {}
}

class Log_Module extends Module {
  constructor() {
    super('campaigns[log]', new UseCaseRunner())
  }

  @UseCase()
  async write(): Promise<void> {}
}

describe('contractOf', () => {
  test('has the use cases a module exposes, bound to it, and the events it exposes', async () => {
    const template = new Template_Module()

    const contract = contractOf(template)

    expect(Object.keys(contract).sort()).toEqual(['create', 'events', 'get'])
    expect(await contract.get('t1')).toBe('campaigns[template] t1')
    expect(Object.keys(contract.events)).toEqual(['created'])
    expect(contract.events.created).toBe(template.events.created)
  })

  test('keeps out, in its type too, what the module does not expose', () => {
    const contract = contractOf(new Template_Module())

    // @ts-expect-error archive is not exposed
    expect(contract.archive).toBeUndefined()
    // @ts-expect-error archived is not exposed
    expect(contract.events.archived).toBeUndefined()
  })

  test('of a module that exposes nothing, is empty', () => {
    const contract = contractOf(new Log_Module())

    expect(Object.keys(contract)).toEqual(['events'])
    // @ts-expect-error write is not exposed
    expect(contract.write).toBeUndefined()
  })

  test('cannot be changed', () => {
    const contract = contractOf(new Template_Module()) as Record<string, unknown>

    expect(() => { contract.archive = () => {} }).toThrow()
  })

  test('refuses a name that is none of its use cases or events', () => {
    class Wrong_Module extends Module {
      readonly exposes = { useCases: ['purge'], events: [] } as const
      constructor() {
        super('campaigns[template]', new UseCaseRunner())
      }
    }
    class WrongEvent_Module extends Module {
      readonly exposes = { useCases: [], events: ['deleted'] } as const
      readonly events = eventsOf(bus, { created: Created })
      constructor() {
        super('campaigns[template]', new UseCaseRunner())
      }
    }

    expect(() => contractOf(new Wrong_Module())).toThrow('campaigns[template] exposes purge, which is none of its use cases (marked @UseCase()): none')
    expect(() => contractOf(new WrongEvent_Module())).toThrow('campaigns[template] exposes the event deleted, which is none of its events: created')
  })
})
