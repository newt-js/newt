import type { HttpRouter }           from '@newt-js/core/http'
// --------------------------------------------------------
import type { UserEmailLink_Module } from './user-email-link.module'

/** None yet: links are made by its worker, and redeemed through a route still to come. */
export function registerUserEmailLinkRoutes(router: HttpRouter, _userEmailLinks: UserEmailLink_Module) {
  return { one: router.group('/user-email-links/:userEmailLinkId') }
}
