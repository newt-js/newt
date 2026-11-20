import type { Resolved }        from '@newt-js/core'
import { z }                    from 'zod'
// --------------------------------------------------------
import type { UserDTO }         from '../user/user.schema'
import { UserEmailLinkId }      from './value-objects/user-email-link-id'
import { UserEmailLinkPurpose } from './value-objects/user-email-link-purpose'
import { UserId }               from './value-objects/user-id'

/** A link sent by email that works once and expires. Its token is only ever kept hashed. */
export const UserEmailLinkSchema = z.object({
  id: UserEmailLinkId.schema,
  userId: UserId.schema,
  purpose: UserEmailLinkPurpose.schema,
  tokenHash: z.string(),
  expiresAt: z.string(),
  usedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** What a link shows: never its token's hash. */
export const UserEmailLinkPublicSchema = UserEmailLinkSchema.omit({ tokenHash: true })

/** The token of a link, as it came in its email. */
export const UserEmailLinkTokenSchema = z.string().max(100)

/** The user a link is of, shown whole in its DTO. */
export type UserEmailLinkReferences = { userId: UserDTO }

export type UserEmailLinkFields = z.infer<typeof UserEmailLinkSchema>
export type UserEmailLinkDTO = Resolved<z.infer<typeof UserEmailLinkPublicSchema>, UserEmailLinkReferences>
