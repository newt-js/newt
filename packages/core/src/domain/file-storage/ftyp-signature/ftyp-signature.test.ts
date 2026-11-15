import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { ftypSignature } from './ftyp-signature'

describe('ftypSignature', () => {
  test('looks for ftyp and the brand from byte 4', () => {
    expect(ftypSignature('avif', ['image/avif'])).toEqual({ bytes: [0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66], at: 4, types: ['image/avif'] })
  })

  test('with no brand, ftyp alone', () => {
    expect(ftypSignature('', ['video/mp4']).bytes).toEqual([0x66, 0x74, 0x79, 0x70])
  })
})
