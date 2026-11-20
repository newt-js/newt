import { Module }                           from '@newt-js/core'
import { UseCase }                          from '@newt-js/core'
import { eventsOf }                         from '@newt-js/core'
import type { ContextBase }                 from '@newt-js/core/application'
import type { HttpRouter }                  from '@newt-js/core/http'
// --------------------------------------------------------
import { OauthAuthorization_Created }       from './events/oauth-authorization-created'
import type { OauthAuthorization_Deps }     from './oauth-authorization.deps'
import { OauthAuthorization_Repository }    from './oauth-authorization.repository'
import { registerOauthAuthorizationRoutes } from './oauth-authorization.routes'
import type { OauthDiscoveryDTO }           from './oauth-authorization.schema'

/** OpenID Connect for each application: code + PKCE only, as OAuth 2.1 asks. */
export class OauthAuthorization_Module extends Module {

  static initialize(base: ContextBase, router: HttpRouter, deps: OauthAuthorization_Deps): OauthAuthorization_Module {
    const repository = new OauthAuthorization_Repository(base)
    const module = new OauthAuthorization_Module(base, repository, router, deps)
    return module
  }

  readonly events
  readonly routes
  /** Where auth's routes are: an application's issuer is its address and this path. */
  private readonly prefix: string

  private constructor(
    base: ContextBase,
    private readonly repository: OauthAuthorization_Repository,
    router: HttpRouter,
    private readonly deps: OauthAuthorization_Deps,
  ) {
    super('oauthAuthorization', base.useCaseRunner, deps)
    this.prefix = router.prefix
    this.events = eventsOf(base.bus, {
      created: OauthAuthorization_Created,
    })
    this.routes = registerOauthAuthorizationRoutes(router, this)
  }

  /** The OpenID configuration of the application at a host: each one has its own issuer. */
  @UseCase()
  async discovery(host: string): Promise<OauthDiscoveryDTO> {
    const issuer = await this.issuerAt(host)
    return {
      issuer,
      authorization_endpoint: `${issuer}/oauth-authorizations/authorize`,
      token_endpoint: `${issuer}/oauth-authorizations/token`,
      jwks_uri: `${issuer}/oauth-signing-keys`,
      end_session_endpoint: `${issuer}/oauth-authorizations/end-session`,
      response_types_supported: ['code'],
      response_modes_supported: ['query'],
      grant_types_supported: ['authorization_code'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post'],
      subject_types_supported: ['public'],
      id_token_signing_alg_values_supported: ['RS256'],
      scopes_supported: ['openid', 'email', 'profile'],
      claims_supported: ['iss', 'sub', 'aud', 'exp', 'iat', 'auth_time', 'nonce', 'amr', 'email', 'email_verified', 'name'],
      authorization_response_iss_parameter_supported: true,
    }
  }

  private async issuerAt(host: string): Promise<string> {
    const { url } = await this.deps.application.fromHost(host)
    return `${url}${this.prefix}`
  }

}
