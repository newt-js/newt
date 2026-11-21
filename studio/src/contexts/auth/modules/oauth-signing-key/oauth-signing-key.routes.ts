import type { HttpRouter }             from '@newt-js/core/http'
// --------------------------------------------------------
import type { OauthSigningKey_Module } from './oauth-signing-key.module'

/** Public: the JWKS, which anyone checking a token of auth needs. Its address is `jwks_uri` in the discovery. */
export function registerOauthSigningKeyRoutes(router: HttpRouter, oauthSigningKeys: OauthSigningKey_Module) {
  router.get('/oauth-signing-keys', async () => {
    return Response.json(await oauthSigningKeys.jwks(), { headers: { 'cache-control': 'public, max-age=300' } })
  }, { public: true })
  return { one: router.group('/oauth-signing-keys/:oauthSigningKeyId') }
}
