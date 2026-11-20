import { expect }                      from 'bun:test'
import { test }                        from 'bun:test'
// --------------------------------------------------------
import { InvalidUserEmailLinkPurpose } from '../errors/invalid-user-email-link-purpose'
import { UserEmailLinkPurpose }        from './user-email-link-purpose'

test('a user email link purpose, as it is kept', () => {
  expect(UserEmailLinkPurpose.from('access')).toBe(UserEmailLinkPurpose.access)
})

test('refuses what is not a user email link purpose', () => {
  expect(() => UserEmailLinkPurpose.from('reset' as never)).toThrow(InvalidUserEmailLinkPurpose)
})
