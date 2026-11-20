import { Entity }                       from '@newt-js/core'
import type { EntityInput }             from '@newt-js/core'
import type { Resolved }                from '@newt-js/core'
// --------------------------------------------------------
import type { UserDTO }                 from '../user/user.schema'
import { UserEmailLink_Created }        from './events/user-email-link-created'
import type { UserEmailLinkFields }     from './user-email-link.schema'
import { UserEmailLinkPublicSchema }    from './user-email-link.schema'
import type { UserEmailLinkReferences } from './user-email-link.schema'
import { UserEmailLinkSchema }          from './user-email-link.schema'
import { UserEmailLinkPurpose }         from './value-objects/user-email-link-purpose'

/** How long someone given access has to set its password: then an admin grants it again. */
const ACCESS_LIFETIME_MS = 3 * 24 * 60 * 60 * 1000

export type UserEmailLinkAccessProps = {
  user: UserDTO,
  tokenHash: string,
  now: Date,
}

type UserEmailLinkRowDTO = Resolved<UserEmailLinkFields, UserEmailLinkReferences>

export class UserEmailLink
  extends Entity<typeof UserEmailLinkSchema, typeof UserEmailLinkPublicSchema, UserEmailLinkReferences> {

  private constructor(input: EntityInput<UserEmailLinkRowDTO>, isNew: boolean) {
    super(UserEmailLinkSchema, input, isNew, UserEmailLinkPublicSchema)
  }

  static fromDTO(row: UserEmailLinkRowDTO & { version: number }): UserEmailLink {
    return new UserEmailLink(row, false)
  }

  /** The link that lets in someone an admin gave access. */
  static access({ user, tokenHash, now }: UserEmailLinkAccessProps): UserEmailLink {
    const expiresAt = new Date(now.getTime() + ACCESS_LIFETIME_MS).toISOString()
    const link = new UserEmailLink({ user, purpose: UserEmailLinkPurpose.access, tokenHash, expiresAt, usedAt: null }, true)
    link.trackEvent(new UserEmailLink_Created(link.data))
    return link
  }

  isUsable(now: Date): boolean {
    return this.data.usedAt === null && now < new Date(this.data.expiresAt)
  }

  /** Spent: it never works again. Using it twice changes nothing. */
  use(now: Date): void {
    if (this.data.usedAt === null) {
      this.change({ usedAt: now.toISOString() })
    }
  }

}
