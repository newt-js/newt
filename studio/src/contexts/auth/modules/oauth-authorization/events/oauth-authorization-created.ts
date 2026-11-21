import { defineEvent }                    from '@newt-js/core'
// --------------------------------------------------------
import { OauthAuthorizationPublicSchema } from '../oauth-authorization.schema'

export const OauthAuthorization_Created = defineEvent(
  'oauthAuthorization.created',
  OauthAuthorizationPublicSchema,
)
