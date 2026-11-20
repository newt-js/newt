import type { ApplicationClient_Module } from '../application-client/application-client.module'
import type { Application_Module }       from '../application/application.module'
import type { OauthSigningKey_Module }   from '../oauth-signing-key/oauth-signing-key.module'
import type { SignInSession_Module }     from '../sign-in-session/sign-in-session.module'
import type { User_Module }              from '../user/user.module'

export type OauthAuthorization_Deps = {
  application: Application_Module
  applicationClient: ApplicationClient_Module
  oauthSigningKey: OauthSigningKey_Module
  signInSession: SignInSession_Module
  user: User_Module
}
