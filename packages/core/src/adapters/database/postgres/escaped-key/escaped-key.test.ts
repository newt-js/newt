import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { escapedKey } from './escaped-key'

describe('escapedKey', () => {
  test('leaves a plain key as it is', () => {
    expect(escapedKey('order:42')).toBe('order:42')
  })

  // -----

  test('doubles a backslash and writes a NUL as backslash zero, so two keys never share a text', () => {
    expect(escapedKey('a\\b')).toBe('a\\\\b')
    expect(escapedKey('a\0b')).toBe('a\\0b')
    expect(escapedKey('a\\0b')).not.toBe(escapedKey('a\0b'))
  })
})
