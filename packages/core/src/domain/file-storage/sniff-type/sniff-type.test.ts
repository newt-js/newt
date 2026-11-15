import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { matchesType } from './sniff-type'

const PNG = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
const ftyp = (brand: string) => new Uint8Array([0, 0, 0, 0x18, ...new TextEncoder().encode(`ftyp${brand}`), 0, 0, 0, 0])
const EXE = new Uint8Array([0x4D, 0x5A, 0x90, 0])

describe('matchesType', () => {
  test('a file is the type its first bytes say', () => {
    expect(matchesType(PNG, 'image/png')).toBe(true)
    expect(matchesType(PNG, 'image/jpeg')).toBe(false)
  })

  test('a program is refused under any type a module would take', () => {
    expect(matchesType(EXE, 'image/png')).toBe(false)
    expect(matchesType(EXE, 'text/plain')).toBe(false)
  })

  test('bytes of no known kind fit any type that has no signature, as text', () => {
    expect(matchesType(new TextEncoder().encode('hello'), 'text/plain; charset=utf-8')).toBe(true)
    expect(matchesType(new TextEncoder().encode('hello'), 'image/png')).toBe(false)
  })

  test('a file of the mp4 family is the type its brand says', () => {
    expect(matchesType(ftyp('heic'), 'image/heic')).toBe(true)
    expect(matchesType(ftyp('heic'), 'image/png')).toBe(false)
    expect(matchesType(ftyp('heic'), 'video/mp4')).toBe(false)
    expect(matchesType(ftyp('mif1'), 'image/heif')).toBe(true)
    expect(matchesType(ftyp('qt  '), 'video/quicktime')).toBe(true)
    expect(matchesType(ftyp('M4A '), 'audio/x-m4a')).toBe(true)
    expect(matchesType(ftyp('avif'), 'image/avif')).toBe(true)
    expect(matchesType(ftyp('isom'), 'video/mp4')).toBe(true)
  })
})
