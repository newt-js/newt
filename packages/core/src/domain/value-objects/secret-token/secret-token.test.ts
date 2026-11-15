import { describe }           from 'bun:test'
import { expect }             from 'bun:test'
import { test }               from 'bun:test'
// --------------------------------------------------------
import { InvalidSecretToken } from './invalid-secret-token/invalid-secret-token'
import { SecretToken }        from './secret-token'
import { secretTokenFactory } from './secret-token'

describe('SecretToken', () => {
  test('is 32 random bytes in base64url, a new one each time', () => {
    const token = SecretToken.generate()

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(SecretToken.generate()).not.toBe(token)
  })

  test('takes back only what it could have generated', () => {
    const token = SecretToken.generate()

    expect(SecretToken.from(token)).toBe(token)
    expect(() => SecretToken.from('short')).toThrow(InvalidSecretToken)
    expect(() => SecretToken.from(`${token}A`)).toThrow()
    expect(() => SecretToken.from(` ${token}`)).toThrow()
    for (const char of ['+', '/', '.', '=']) {
      expect(() => SecretToken.from(`${'A'.repeat(42)}${char}`)).toThrow()
    }
  })

  test('one it refuses is a validation error that never repeats what was sent', () => {
    const refused = (() => {
      try {
        SecretToken.from('leaked-guess')
      } catch (error) {
        return error as InvalidSecretToken
      }
    })()!

    expect(refused).toMatchObject({ kind: 'validation', code: 'invalid_secret_token' })
    expect(refused.message).not.toContain('leaked-guess')
  })

  test('tryFrom takes what a cookie carries: a token, or none, never an error', () => {
    const token = SecretToken.generate()
    expect(SecretToken.tryFrom(token)).toBe(token)
    expect(SecretToken.tryFrom('leaked-guess')).toBeUndefined()
    expect(SecretToken.tryFrom(null)).toBeUndefined()
    expect(SecretToken.tryFrom(undefined)).toBeUndefined()
  })

  test('hashes with SHA-256: stored hashes depend on it never changing', () => {
    const token = SecretToken.from('A'.repeat(43))
    expect(SecretToken.hash(token)).toBe('0f007385b6f9d4b7eeb2748605afe1a984a0a3bfa3f014d09e2a784ce9e5cd1a')
  })
})

describe('secretTokenFactory', () => {
  test('makes the secret token value object: one it generates is taken back, anything else refused', () => {
    const SecretToken = secretTokenFactory()
    const token = SecretToken.generate()

    expect(SecretToken.from(token)).toBe(token)
    expect(() => SecretToken.from('short')).toThrow(InvalidSecretToken)
  })
})
