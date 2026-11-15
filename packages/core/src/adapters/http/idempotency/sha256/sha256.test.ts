import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { sha256 }   from './sha256'

describe('sha256', () => {
  test('the hex SHA-256 of a text or of bytes, the same for the same content', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
    expect(sha256(new TextEncoder().encode('abc'))).toBe(sha256('abc'))
    expect(sha256('abd')).not.toBe(sha256('abc'))
  })
})
