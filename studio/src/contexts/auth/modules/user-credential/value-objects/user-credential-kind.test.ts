import { expect }                    from 'bun:test'
import { test }                      from 'bun:test'
// --------------------------------------------------------
import { InvalidUserCredentialKind } from '../errors/invalid-user-credential-kind'
import { UserCredentialKind }        from './user-credential-kind'

test('a user credential kind, as it is kept', () => {
  expect(UserCredentialKind.from('password')).toBe(UserCredentialKind.password)
})

test('refuses what is not a user credential kind', () => {
  const unknown = () => UserCredentialKind.from('passkey' as never)
  expect(unknown).toThrow(InvalidUserCredentialKind)
})
