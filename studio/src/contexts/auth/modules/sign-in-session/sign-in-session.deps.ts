import type { Application_Module }   from '../application/application.module'
import type { SignInAttempt_Module } from '../sign-in-attempt/sign-in-attempt.module'
import type { User_Module }          from '../user/user.module'

export type SignInSession_Deps = {
  signInAttempt: SignInAttempt_Module
  application: Application_Module
  user: User_Module
}
