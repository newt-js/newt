import { Repository }                    from '@newt-js/core'
import type { ResolvedRow }              from '@newt-js/core'
import type { ContextBase }              from '@newt-js/core/application'
// --------------------------------------------------------
import { OauthAuthorization }            from './oauth-authorization'
import type { OauthAuthorization_Deps }  from './oauth-authorization.deps'
import type { OauthAuthorizationFields } from './oauth-authorization.schema'

export type OauthAuthorizationRow = OauthAuthorizationFields & { version: number }

export class OauthAuthorization_Repository extends Repository<OauthAuthorization, OauthAuthorizationRow> {

  constructor(base: ContextBase, { applicationClient, user }: OauthAuthorization_Deps) {
    const records = base.database.records<OauthAuthorizationRow>('oauth_authorization')
    super(base, records, {
      scope: 'none',
      references: {
        clientId: ids => applicationClient.find({ field: 'id', op: 'in', value: ids }),
        userId: ids => user.find({ field: 'id', op: 'in', value: ids }),
      },
    })
  }

  protected toEntity(row: ResolvedRow<OauthAuthorizationRow, OauthAuthorization>): OauthAuthorization {
    return OauthAuthorization.fromDTO(row)
  }

}
