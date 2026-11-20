import type { UserCredential_Module } from './user-credential.module'

export function registerUserCredentialWorkers(
  credentials: UserCredential_Module,
): void {
  credentials.on(
    credentials.events.setFromEmailLink,
    'closeEmailLink',
    ({ userId, emailLinkId }) => [{ userId, emailLinkId }],
  )
}
