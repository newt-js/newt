import type { HttpRouter }           from '@newt-js/core/http'
import { bodyOf }                    from '@newt-js/core/http'
// --------------------------------------------------------
import type { UserEmailLink_Module } from './user-email-link.module'

/** The admin's: a new access email. Links are redeemed through userCredential, which sets the password. */
export function registerUserEmailLinkRoutes(router: HttpRouter, userEmailLinks: UserEmailLink_Module) {
  router.post('/user-email-links', async request => {
    await userEmailLinks.resendAccess(await bodyOf(request))
    return new Response(null, { status: 204 })
  })
  return { one: router.group('/user-email-links/:userEmailLinkId') }
}
