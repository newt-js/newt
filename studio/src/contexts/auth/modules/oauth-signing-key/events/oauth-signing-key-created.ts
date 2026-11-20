import { defineEvent }                 from '@newt-js/core'
// --------------------------------------------------------
import { OauthSigningKeyPublicSchema } from '../oauth-signing-key.schema'

export const OauthSigningKey_Created = defineEvent(
  'oauthSigningKey.created',
  OauthSigningKeyPublicSchema,
)
