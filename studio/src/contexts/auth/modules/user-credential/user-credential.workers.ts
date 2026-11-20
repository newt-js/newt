import type { UserCredential_Module } from './user-credential.module'

export function registerUserCredentialWorkers(
  credentials: UserCredential_Module,
): void {
  credentials.on(
    credentials.events.setFromEmailLink,
    'spendEmailLink',
    ({ emailLinkId }) => [emailLinkId],
  )
  credentials.on(
    credentials.events.setFromEmailLink,
    'verifyEmailOfLink',
    ({ userId }) => [userId],
  )
}
