import { defineEvent }                from '@newt-js/core'
// --------------------------------------------------------
import { UserCredentialPublicSchema } from '../user-credential.schema'

export const UserCredential_Created = defineEvent(
  'userCredential.created',
  UserCredentialPublicSchema,
)
