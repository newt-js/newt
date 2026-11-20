import type { HttpRouter }                from '@newt-js/core/http'
import { requestHost }                    from '@newt-js/core/http'
// --------------------------------------------------------
import type { OauthAuthorization_Module } from './oauth-authorization.module'

/** The host a request came to, which says the application. */
export function hostOf(request: Request): string {
  return requestHost(request) ?? new URL(request.url).host
}

/** OpenID's endpoints: public, since they are how one signs in. */
export function registerOauthAuthorizationRoutes(router: HttpRouter, oauthAuthorizations: OauthAuthorization_Module) {
  // Its path is fixed by OpenID Connect Discovery: the issuer and this.
  router.get('/.well-known/openid-configuration', async request => {
    return Response.json(await oauthAuthorizations.discovery(hostOf(request)))
  }, { public: true })
  return { one: router.group('/oauth-authorizations/:oauthAuthorizationId') }
}
