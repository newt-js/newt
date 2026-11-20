import { Entity }                            from '@newt-js/core'
import type { EntityInput }                  from '@newt-js/core'
import type { Resolved }                     from '@newt-js/core'
// --------------------------------------------------------
import type { ApplicationClientDTO }         from '../application-client/application-client.schema'
import type { UserDTO }                      from '../user/user.schema'
import { OauthAuthorization_Created }        from './events/oauth-authorization-created'
import type { OauthAuthorizationFields }     from './oauth-authorization.schema'
import { OauthAuthorizationPublicSchema }    from './oauth-authorization.schema'
import type { OauthAuthorizationReferences } from './oauth-authorization.schema'
import { OauthAuthorizationSchema }          from './oauth-authorization.schema'

/** A code is exchanged at once by the client's backend: a minute is plenty, and little for a thief. */
const CODE_LIFETIME_MS = 60 * 1000

export type OauthAuthorizationIssueProps = {
  client: ApplicationClientDTO,
  user: UserDTO,
  redirectUri: string,
  scopes: string[],
  codeChallenge: string,
  nonce: string | null,
  amr: string[],
  authTime: string,
  codeHash: string,
  now: Date,
}

type OauthAuthorizationRowDTO = Resolved<OauthAuthorizationFields, OauthAuthorizationReferences>

export class OauthAuthorization
  extends Entity<typeof OauthAuthorizationSchema, typeof OauthAuthorizationPublicSchema, OauthAuthorizationReferences> {

  private constructor(input: EntityInput<OauthAuthorizationRowDTO>, isNew: boolean) {
    super(OauthAuthorizationSchema, input, isNew, OauthAuthorizationPublicSchema)
  }

  static fromDTO(row: OauthAuthorizationRowDTO & { version: number }): OauthAuthorization {
    return new OauthAuthorization(row, false)
  }

  /** What someone signed in allows a client, with the hash of the code the client exchanges once. */
  static issue({ now, ...props }: OauthAuthorizationIssueProps): OauthAuthorization {
    const expiresAt = new Date(now.getTime() + CODE_LIFETIME_MS).toISOString()
    const authorization = new OauthAuthorization({ ...props, expiresAt, usedAt: null }, true)
    authorization.trackEvent(new OauthAuthorization_Created(authorization.data))
    return authorization
  }

}
