import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { test }              from 'bun:test'
// --------------------------------------------------------
import { UnauthorizedError } from '../../errors/unauthorized-error/unauthorized-error'
import { NoActor }           from './no-actor'

describe('NoActor', () => {
  test('is an unauthorized error that asks to sign in', () => {
    const error = new NoActor()

    expect(error).toBeInstanceOf(UnauthorizedError)
    expect(error.code).toBe('not_signed_in')
    expect(error.message).toBe('Sign in to continue')
  })
})
