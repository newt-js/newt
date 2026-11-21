import { defineEvent }                          from '@newt-js/core'
// --------------------------------------------------------
import { UserCredentialSetFromEmailLinkSchema } from '../user-credential.schema'

/** A password set from an email link: the link is spent, and the email proved the user's. */
export const UserCredential_SetFromEmailLink = defineEvent(
  'userCredential.setFromEmailLink',
  UserCredentialSetFromEmailLinkSchema,
)
