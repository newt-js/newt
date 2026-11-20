import type { Application_Module }    from '../application/application.module'
import type { UserCredential_Module } from '../user-credential/user-credential.module'
import type { User_Module }           from '../user/user.module'

export type SignInAttempt_Deps = {
  application: Application_Module
  user: User_Module
  userCredential: UserCredential_Module
}
