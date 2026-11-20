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

/** A PKCE verifier, as RFC 7636 writes it. */
const CODE_VERIFIER = /^[\w.~-]{43,128}$/

export type OauthAuthorizationExchangeProps = {
  clientId: string,
  redirectUri: string,
  codeVerifier: string,
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

  /**
   * Whether a client may exchange the code now: the code is unused and in time, the client and redirect_uri are those
   * it was given to, and the verifier is the one of its PKCE challenge.
   */
  canBeExchanged({ clientId, redirectUri, codeVerifier, now }: OauthAuthorizationExchangeProps): boolean {
    const challenge = new Bun.CryptoHasher('sha256').update(codeVerifier).digest('base64url')
    return this.data.usedAt === null
      && now < new Date(this.data.expiresAt)
      && this.data.clientId === clientId
      && this.data.redirectUri === redirectUri
      && CODE_VERIFIER.test(codeVerifier)
      && challenge === this.data.codeChallenge
  }

  /** Exchanged: the code never works again. */
  use(now: Date): void {
    this.change({ usedAt: now.toISOString() })
  }

}
