import { Repository }                 from '@newt-js/core'
import type { ResolvedRow }           from '@newt-js/core'
import type { ContextBase }           from '@newt-js/core/application'
// --------------------------------------------------------
import { OauthSigningKey }            from './oauth-signing-key'
import type { OauthSigningKeyFields } from './oauth-signing-key.schema'

export type OauthSigningKeyRow = OauthSigningKeyFields & { version: number }

export class OauthSigningKey_Repository extends Repository<OauthSigningKey, OauthSigningKeyRow> {

  constructor(base: ContextBase) {
    const records = base.database.records<OauthSigningKeyRow>('oauth_signing_key')
    super(base, records, { scope: 'none' })
  }

  protected toEntity(row: ResolvedRow<OauthSigningKeyRow, OauthSigningKey>): OauthSigningKey {
    return OauthSigningKey.fromDTO(row)
  }

}
