import { defineValueObject } from '@newt-js/core'
import { z }                 from 'zod'
// --------------------------------------------------------
import { InvalidSignInStep } from '../errors/invalid-sign-in-step'

/** A step of a sign-in: today, only a password. The steps done are the session's `amr`. */
export const SignInStep = defineValueObject(
  z.enum(['password']),
  text => new InvalidSignInStep(text),
  { password: 'password' as const },
)
export type SignInStep = z.output<typeof SignInStep.schema>
