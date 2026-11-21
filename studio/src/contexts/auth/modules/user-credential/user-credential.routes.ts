import type { ContextBase }           from '@newt-js/core/application'
import type { HttpRouter }            from '@newt-js/core/http'
import { bodyOf }                     from '@newt-js/core/http'
// --------------------------------------------------------
import type { UserCredential_Module } from './user-credential.module'

export function registerUserCredentialRoutes(router: HttpRouter, credentials: UserCredential_Module, rateLimits: ContextBase['rateLimits']) {
  // Both public: each address, a few passwords a minute, so a link or the setup is never guessed at will.
  const passwords = rateLimits.define('userCredential.passwords', { limit: 10, windowMs: 60_000 })
  const rateLimit = { limit: passwords, by: 'ip' as const }
  router.post('/setup/password', async request => {
    const body = await bodyOf(request)
    await credentials.setFirstAdminPassword(body)
    return new Response(null, { status: 204 })
  }, { public: true, rateLimit })
  // Public: who has the link has no session yet; the link is what lets it in.
  router.post('/user-credentials', async request => {
    await credentials.setPasswordFromEmailLink(await bodyOf(request))
    return new Response(null, { status: 204 })
  }, { public: true, rateLimit })
  return { one: router.group('/setup') }
}
