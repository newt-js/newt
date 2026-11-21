import { defineValueObject }           from '@newt-js/core'
import { z }                           from 'zod'
// --------------------------------------------------------
import { InvalidUserEmailLinkPurpose } from '../errors/invalid-user-email-link-purpose'

/** What a link is for: today, letting in someone an admin gave access. Later, verifying an email or a lost password. */
export const UserEmailLinkPurpose = defineValueObject(
  z.enum(['access']),
  text => new InvalidUserEmailLinkPurpose(text),
  { access: 'access' as const },
)
export type UserEmailLinkPurpose = z.output<typeof UserEmailLinkPurpose.schema>
