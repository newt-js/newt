import { defineValueObject } from '@newt-js/core'
import { z }                 from 'zod'
// --------------------------------------------------------
import { InvalidSignInStep } from '../errors/invalid-sign-in-step'

/** How one signed in: the steps of the attempt that opened the session, its `amr`. */
export const SignInStep = defineValueObject(
  z.enum(['password']),
  text => new InvalidSignInStep(text),
  { password: 'password' as const },
)
export type SignInStep = z.output<typeof SignInStep.schema>
