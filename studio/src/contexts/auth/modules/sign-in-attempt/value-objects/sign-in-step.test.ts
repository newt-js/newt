import { expect }            from 'bun:test'
import { test }              from 'bun:test'
// --------------------------------------------------------
import { InvalidSignInStep } from '../errors/invalid-sign-in-step'
import { SignInStep }        from './sign-in-step'

test('a sign in step, as it is kept', () => {
  expect(SignInStep.from('password')).toBe(SignInStep.password)
})

test('refuses what is not a sign in step', () => {
  expect(() => SignInStep.from('totp' as never)).toThrow(InvalidSignInStep)
})
