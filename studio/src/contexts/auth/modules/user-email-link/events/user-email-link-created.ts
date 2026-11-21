import { defineEvent }               from '@newt-js/core'
// --------------------------------------------------------
import { UserEmailLinkPublicSchema } from '../user-email-link.schema'

export const UserEmailLink_Created = defineEvent(
  'userEmailLink.created',
  UserEmailLinkPublicSchema,
)
