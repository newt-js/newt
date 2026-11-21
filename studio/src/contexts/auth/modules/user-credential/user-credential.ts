import { Entity }                          from '@newt-js/core'
import type { EntityInput }                from '@newt-js/core'
// --------------------------------------------------------
import { UserCredential_Created }          from './events/user-credential-created'
import { UserCredential_SetFromEmailLink } from './events/user-credential-set-from-email-link'
import type { UserCredentialFields }       from './user-credential.schema'
import { UserCredentialPublicSchema }      from './user-credential.schema'
import { UserCredentialSchema }            from './user-credential.schema'
import { UserCredentialKind }              from './value-objects/user-credential-kind'
import type { UserEmailLinkId }            from './value-objects/user-email-link-id'
import type { UserId }                     from './value-objects/user-id'

export type UserCredentialPasswordProps = {
  userId: UserId,
  secretHash: string,
}

export type UserCredentialPasswordFromEmailLinkProps = UserCredentialPasswordProps & {
  emailLinkId: UserEmailLinkId,
}

export class UserCredential extends Entity<typeof UserCredentialSchema, typeof UserCredentialPublicSchema> {

  private constructor(
    input: EntityInput<UserCredentialFields>,
    isNew: boolean,
  ) {
    super(UserCredentialSchema, input, isNew, UserCredentialPublicSchema)
  }

  static fromDTO(
    row: UserCredentialFields & { version: number },
  ): UserCredential {
    return new UserCredential(row, false)
  }

  /** A password, by its hash: the password itself is never kept. */
  static password(props: UserCredentialPasswordProps): UserCredential {
    const input = { ...props, kind: UserCredentialKind.password }
    const credential = new UserCredential(input, true)
    credential.trackEvent(new UserCredential_Created(credential.toDTO()))
    return credential
  }

  /** A first password, set from an email link: it tells, so the link is spent. */
  static passwordFromEmailLink({ emailLinkId, ...props }: UserCredentialPasswordFromEmailLinkProps): UserCredential {
    const credential = UserCredential.password(props)
    credential.trackEvent(new UserCredential_SetFromEmailLink({ userId: props.userId, emailLinkId }))
    return credential
  }

  get secretHash(): string | null {
    return this.data.secretHash
  }

  changeSecret(secretHash: string): void {
    this.change({ secretHash })
  }

}
