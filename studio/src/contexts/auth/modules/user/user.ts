import { Entity }              from '@newt-js/core'
import type { EntityInput }    from '@newt-js/core'
// --------------------------------------------------------
import type { ApplicationDTO } from '../application/application.schema'
import { User_Created }        from './events/user-created'
import type { UserDTO }        from './user.schema'
import type { UserReferences } from './user.schema'
import { UserSchema }          from './user.schema'

export type UserCreateProps = {
  application: ApplicationDTO,
  email: string | null,
  name: string,
}

export class User
  extends Entity<typeof UserSchema, typeof UserSchema, UserReferences> {

  private constructor(input: EntityInput<UserDTO>, isNew: boolean) {
    super(UserSchema, input, isNew)
  }

  static fromDTO(dto: UserDTO & { version: number }): User {
    return new User(dto, false)
  }

  /** A user of the application, its email not verified yet. */
  static create(props: UserCreateProps): User {
    const user = new User({ ...props, emailVerified: false }, true)
    // What it keeps, the application by its id: events carry ids.
    user.trackEvent(new User_Created(user.data))
    return user
  }

}
