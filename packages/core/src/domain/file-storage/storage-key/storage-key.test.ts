import { describe }         from 'bun:test'
import { expect }           from 'bun:test'
import { test }             from 'bun:test'
// --------------------------------------------------------
import { assertStorageKey } from './storage-key'

describe('assertStorageKey', () => {
  test('takes names of letters, digits, dots, underscores and dashes joined by slashes', () => {
    expect(() => assertStorageKey('cards/c1/cover_2.png')).not.toThrow()
  })

  test('refuses an empty segment, one that starts with a dot, a parent, or a key too long', () => {
    expect(() => assertStorageKey('cards//c1')).toThrow('is no storage key')
    expect(() => assertStorageKey('.hidden')).toThrow('is no storage key')
    expect(() => assertStorageKey('cards/../secrets')).toThrow('is no storage key')
    expect(() => assertStorageKey('a/'.repeat(500))).toThrow('is no storage key')
  })
})
