import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { ContextRegistry } from './context-registry'

class CardModule {
  readonly name = 'card'
}

describe('ContextRegistry', () => {
  test('knows each module with what it was given and its use cases', () => {
    const registry = new ContextRegistry('board')
    const card = new CardModule()
    registry.module(card, { db: 'x' })
    registry.useCase(card, 'create', { retryOnConflict: false })

    expect(registry.context).toBe('board')
    expect(registry.registeredModules).toEqual([
      { instance: card, className: 'CardModule', deps: { db: 'x' }, useCases: new Map([['create', { retryOnConflict: false }]]) },
    ])
  })

  test('a module built again takes the place of the one before', () => {
    const registry = new ContextRegistry('board')
    registry.module(new CardModule())
    const again = new CardModule()
    registry.module(again)

    expect(registry.registeredModules.map(module => module.instance)).toEqual([again])
  })

  test('registers the module of a use case it did not know yet', () => {
    const registry = new ContextRegistry('board')
    const card = new CardModule()
    registry.useCase(card, 'create')

    expect(registry.registeredModules[0]?.useCases).toEqual(new Map([['create', {}]]))
  })

  test('tells a use case of its modules from any other name', () => {
    const registry = new ContextRegistry('board')
    registry.useCase(new CardModule(), 'create')

    expect(registry.isUseCase('card.create')).toBe(true)
    expect(registry.isUseCase('card.delete')).toBe(false)
    expect(registry.isUseCase('job.claim')).toBe(false)
  })

  test('knows the cron of each schedule', () => {
    const registry = new ContextRegistry('board')
    registry.schedule('daily-report', '0 8 * * *')

    expect(registry.cron('daily-report')).toBe('0 8 * * *')
    expect(registry.cron('card.created')).toBeUndefined()
  })

  test('forgets a subscription when told to', () => {
    const registry = new ContextRegistry('board')
    const subscription = { event: 'card.created', strategy: 'handler' as const, queue: null, attempts: null, filtered: false }
    const unsubscribe = registry.subscription(subscription)

    expect(registry.subscriptions).toEqual([subscription])
    unsubscribe()
    expect(registry.subscriptions).toEqual([])
  })
})
