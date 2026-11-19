import { z }                  from 'zod'
// --------------------------------------------------------
import { UserCredentialId }   from './value-objects/user-credential-id'
import { UserCredentialKind } from './value-objects/user-credential-kind'
import { UserId }             from './value-objects/user-id'

/** Long enough for a pass phrase, short enough to hash cheaply. */
const LONGEST_PASSWORD = 256

/** How a user proves who it is: today, a password. */
export const UserCredentialSchema = z.object({
  id: UserCredentialId.schema,
  userId: UserId.schema,
  kind: UserCredentialKind.schema,
  secretHash: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** What a credential shows: never its secret. */
export const UserCredentialPublicSchema = UserCredentialSchema.omit({
  secretHash: true,
})

/** A new password: as it was typed, never trimmed. */
export const UserCredentialPasswordSchema = z.object({
  userId: UserId.schema,
  password: z.string().min(8).max(LONGEST_PASSWORD),
})

/** A password to check, old rules or not: only its length is bounded. */
export const UserCredentialVerifySchema = z.object({
  userId: UserId.schema,
  password: z.string().max(LONGEST_PASSWORD),
})

export type UserCredentialFields = z.infer<typeof UserCredentialSchema>
export type UserCredentialDTO = z.infer<typeof UserCredentialPublicSchema>
export type UserCredentialPasswordDTO =
  z.input<typeof UserCredentialPasswordSchema>
export type UserCredentialVerifyDTO =
  z.input<typeof UserCredentialVerifySchema>
