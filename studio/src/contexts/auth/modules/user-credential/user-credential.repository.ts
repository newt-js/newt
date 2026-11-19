import { Repository }                from '@newt-js/core'
import type { ResolvedRow }          from '@newt-js/core'
import type { ContextBase }          from '@newt-js/core/application'
// --------------------------------------------------------
import { UserCredential }            from './user-credential'
import type { UserCredentialFields } from './user-credential.schema'

export type UserCredentialRow = UserCredentialFields & { version: number }

export class UserCredential_Repository
  extends Repository<UserCredential, UserCredentialRow> {

  constructor(base: ContextBase) {
    const records = base.database.records<UserCredentialRow>(
      'user_credential',
    )
    super(base, records, { scope: 'none' })
  }

  protected toEntity(
    row: ResolvedRow<UserCredentialRow, UserCredential>,
  ): UserCredential {
    return UserCredential.fromDTO(row)
  }

}
