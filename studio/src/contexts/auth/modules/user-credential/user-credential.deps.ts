import type { UserEmailLink_Module } from '../user-email-link/user-email-link.module'
import type { User_Module }          from '../user/user.module'

export type UserCredential_Deps = {
  user: User_Module
  userEmailLink: UserEmailLink_Module
}
