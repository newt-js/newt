import { Repository }               from '@newt-js/core'
import type { ResolvedRow }         from '@newt-js/core'
import type { ContextBase }         from '@newt-js/core/application'
// --------------------------------------------------------
import { UserEmailLink }            from './user-email-link'
import type { UserEmailLink_Deps }  from './user-email-link.deps'
import type { UserEmailLinkFields } from './user-email-link.schema'

export type UserEmailLinkRow = UserEmailLinkFields & { version: number }

export class UserEmailLink_Repository extends Repository<UserEmailLink, UserEmailLinkRow> {

  constructor(base: ContextBase, { user }: UserEmailLink_Deps) {
    const records = base.database.records<UserEmailLinkRow>('user_email_link')
    super(base, records, {
      scope: 'none',
      references: {
        userId: ids => user.find({ field: 'id', op: 'in', value: ids }),
      },
    })
  }

  protected toEntity(row: ResolvedRow<UserEmailLinkRow, UserEmailLink>): UserEmailLink {
    return UserEmailLink.fromDTO(row)
  }

}
