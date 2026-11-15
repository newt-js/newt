import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { actorScope } from '../actor-scope/actor-scope'
import { runAsActor } from './run-as-actor'

describe('runAsActor', () => {
  test('runs the work as the actor, even after awaiting', async () => {
    const seen = await runAsActor({ userId: 'user-1' }, async () => {
      await Bun.sleep(0)
      return actorScope.get()
    })

    expect(seen).toEqual({ userId: 'user-1' })
  })
})
