import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { NoActor }      from '../no-actor/no-actor'
import { runAsActor }   from '../run-as-actor/run-as-actor'
import { currentActor } from './current-actor'

describe('currentActor', () => {
  test('is whoever the work runs as', () => {
    expect(runAsActor({ userId: 'user-1' }, () => currentActor())).toEqual({ userId: 'user-1' })
  })

  test('throws outside a request: nobody is signed in', () => {
    expect(() => currentActor()).toThrow(NoActor)
  })
})
