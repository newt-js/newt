import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { noObservability } from './no-observability'

describe('noObservability', () => {
  test('runs the use case and gives back what it gives, watching nothing', async () => {
    const result = await noObservability.useCase({ name: 'card.create', module: 'card', context: 'board' }, async attempt => {
      attempt.retrying(new Error('conflict'), 1)
      return 'created'
    })

    expect(result).toBe('created')
    expect(() => noObservability.warn('careful', { useCase: 'card.create' })).not.toThrow()
  })

  test('lets the error of the use case through', async () => {
    const failing = noObservability.useCase({ name: 'card.create', module: 'card', context: 'board' }, async () => {
      throw new Error('boom')
    })

    await expect(failing).rejects.toThrow('boom')
  })
})
