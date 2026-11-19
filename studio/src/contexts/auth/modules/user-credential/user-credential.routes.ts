import type { HttpRouter }            from '@newt-js/core/http'
import { bodyOf }                     from '@newt-js/core/http'
// --------------------------------------------------------
import type { UserCredential_Module } from './user-credential.module'

export function registerUserCredentialRoutes(router: HttpRouter, credentials: UserCredential_Module) {
  router.post('/setup/password', async request => {
    const body = await bodyOf(request)
    await credentials.setFirstAdminPassword(body)
    return new Response(null, { status: 204 })
  }, { public: true })
  return { one: router.group('/setup') }
}
