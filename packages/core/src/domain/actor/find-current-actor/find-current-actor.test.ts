import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
// --------------------------------------------------------
import { runAsActor }       from '../run-as-actor/run-as-actor'
import { findCurrentActor } from './find-current-actor'

describe('findCurrentActor', () => {
  test('is whoever the work runs as, and nobody outside a request', () => {
    expect(runAsActor({ userId: 'user-1' }, () => findCurrentActor())).toEqual({ userId: 'user-1' })
    expect(findCurrentActor()).toBeUndefined()
  })
})
