import { defineEvent }               from '@newt-js/core'
// --------------------------------------------------------
import { SignInAttemptPublicSchema } from '../sign-in-attempt.schema'

export const SignInAttempt_Created = defineEvent(
  'signInAttempt.created',
  SignInAttemptPublicSchema,
)
