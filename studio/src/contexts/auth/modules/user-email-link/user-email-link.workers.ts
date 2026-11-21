import type { UserEmailLink_Deps }   from './user-email-link.deps'
import type { UserEmailLink_Module } from './user-email-link.module'

export function registerUserEmailLinkWorkers(
  userEmailLinks: UserEmailLink_Module,
  deps: UserEmailLink_Deps,
): void {
  userEmailLinks.on(
    deps.user.events.accessGranted,
    'sendAccessEmail',
    accessGranted => [accessGranted.id],
  )
}
