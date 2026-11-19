import { defineValueObject }         from '@newt-js/core'
import { z }                         from 'zod'
// --------------------------------------------------------
import { InvalidUserCredentialKind } from '../errors/invalid-user-credential-kind'

/** How a credential proves who a user is: today, only a password. */
export const UserCredentialKind = defineValueObject(
  z.enum(['password']),
  text => new InvalidUserCredentialKind(text),
  { password: 'password' as const },
)
export type UserCredentialKind = z.output<typeof UserCredentialKind.schema>
