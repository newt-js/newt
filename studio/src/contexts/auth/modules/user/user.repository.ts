import { Repository }       from '@newt-js/core'
import type { ResolvedRow } from '@newt-js/core'
import type { ContextBase } from '@newt-js/core/application'
import type { z }           from 'zod'
// --------------------------------------------------------
import { User }             from './user'
import type { User_Deps }   from './user.deps'
import type { UserSchema }  from './user.schema'

type UserFields = z.infer<typeof UserSchema>

export type UserRow = UserFields & { version: number }

export class User_Repository extends Repository<User, UserRow> {

  constructor(base: ContextBase, { application }: User_Deps) {
    const records = base.database.records<UserRow>('user')
    super(base, records, {
      scope: 'none',
      references: {
        applicationId: ids => application.find({
          field: 'id',
          op: 'in',
          value: ids,
        }),
      },
    })
  }

  protected toEntity(row: ResolvedRow<UserRow, User>): User {
    return User.fromDTO(row)
  }

}
