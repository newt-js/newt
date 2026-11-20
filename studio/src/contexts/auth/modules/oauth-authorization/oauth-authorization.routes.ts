import type { HttpRouter }                from '@newt-js/core/http'
import { requestHost }                    from '@newt-js/core/http'
import { toOauthErrorResponse }           from '@newt-js/core/http'
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
  router.get('/oauth-authorizations/authorize', async request => {
    const query = Object.fromEntries(new URL(request.url).searchParams)
    const cookies = Object.fromEntries(request.cookies.entries())
    const { redirectTo } = await oauthAuthorizations.authorize({ host: hostOf(request), cookies, query })
    return new Response(null, { status: 302, headers: { 'location': redirectTo, 'cache-control': 'no-store' } })
  }, { public: true, onError: error => toOauthErrorResponse(error, 'invalid_request') })
  return { one: router.group('/oauth-authorizations/:oauthAuthorizationId') }
}
