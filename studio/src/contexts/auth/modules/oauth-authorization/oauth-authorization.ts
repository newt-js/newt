import { Entity }                         from '@newt-js/core'
import type { EntityInput }               from '@newt-js/core'
// --------------------------------------------------------
import type { OauthAuthorizationFields }  from './oauth-authorization.schema'
import { OauthAuthorizationPublicSchema } from './oauth-authorization.schema'
import { OauthAuthorizationSchema }       from './oauth-authorization.schema'

export class OauthAuthorization extends Entity<typeof OauthAuthorizationSchema, typeof OauthAuthorizationPublicSchema> {

  private constructor(input: EntityInput<OauthAuthorizationFields>, isNew: boolean) {
    super(OauthAuthorizationSchema, input, isNew, OauthAuthorizationPublicSchema)
  }

  static fromDTO(row: OauthAuthorizationFields & { version: number }): OauthAuthorization {
    return new OauthAuthorization(row, false)
  }

}
