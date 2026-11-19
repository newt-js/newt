import { Entity }                     from '@newt-js/core'
import type { EntityInput }           from '@newt-js/core'
// --------------------------------------------------------
import { UserCredential_Created }     from './events/user-credential-created'
import type { UserCredentialFields }  from './user-credential.schema'
import { UserCredentialPublicSchema } from './user-credential.schema'
import { UserCredentialSchema }       from './user-credential.schema'
import { UserCredentialKind }         from './value-objects/user-credential-kind'
import type { UserId }                from './value-objects/user-id'

export type UserCredentialPasswordProps = {
  userId: UserId,
  secretHash: string,
}

export class UserCredential extends Entity<
  typeof UserCredentialSchema,
  typeof UserCredentialPublicSchema
> {

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

  get secretHash(): string | null {
    return this.data.secretHash
  }

  changeSecret(secretHash: string): void {
    this.change({ secretHash })
  }

}
