import { describe }  from 'bun:test'
import { expect }    from 'bun:test'
import { test }      from 'bun:test'
// --------------------------------------------------------
import { hashedKey } from './hashed-key'

describe('hashedKey', () => {
  test('is the same for one key of one context, and hides it', () => {
    expect(hashedKey('auth', 'ana@example.com')).toBe(hashedKey('auth', 'ana@example.com'))
    expect(hashedKey('auth', 'ana@example.com')).not.toBe(hashedKey('shop', 'ana@example.com'))
    expect(hashedKey('auth', 'ana@example.com')).toMatch(/^[0-9a-f]{64}$/)
  })
})
