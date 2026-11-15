import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { fitsSignature } from './fits-signature'

describe('fitsSignature', () => {
  test('the head starts with the bytes', () => {
    expect(fitsSignature(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]), { bytes: [0xFF, 0xD8, 0xFF], types: [] })).toBe(true)
    expect(fitsSignature(new Uint8Array([0xFF, 0xD8, 0x00]), { bytes: [0xFF, 0xD8, 0xFF], types: [] })).toBe(false)
  })

  test('a null byte matches anything', () => {
    expect(fitsSignature(new Uint8Array([1, 9, 3]), { bytes: [1, null, 3], types: [] })).toBe(true)
  })

  test('the bytes are looked for from where told', () => {
    expect(fitsSignature(new Uint8Array([0, 0, 7, 8]), { bytes: [7, 8], at: 2, types: [] })).toBe(true)
    expect(fitsSignature(new Uint8Array([7, 8, 0, 0]), { bytes: [7, 8], at: 2, types: [] })).toBe(false)
  })

  test('a head too short does not fit', () => {
    expect(fitsSignature(new Uint8Array([1]), { bytes: [1, 2], types: [] })).toBe(false)
  })
})
