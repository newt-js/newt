import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
// --------------------------------------------------------
import { escapeForRfc5987 } from './escape-for-rfc5987'

describe('escapeForRfc5987', () => {
  test('percent-encodes the characters encodeURIComponent leaves as they are', () => {
    expect(escapeForRfc5987('\'')).toBe('%27')
    expect(escapeForRfc5987('(')).toBe('%28')
    expect(escapeForRfc5987(')')).toBe('%29')
    expect(escapeForRfc5987('*')).toBe('%2A')
  })
})
