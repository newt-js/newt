import { defineEvent }               from '@newt-js/core'
// --------------------------------------------------------
import { SignInSessionPublicSchema } from '../sign-in-session.schema'

export const SignInSession_Created = defineEvent(
  'signInSession.created',
  SignInSessionPublicSchema,
)
