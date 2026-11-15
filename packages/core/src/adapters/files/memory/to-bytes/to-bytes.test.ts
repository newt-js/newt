import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { toBytes }  from './to-bytes'

describe('toBytes', () => {
  test('a string becomes its UTF-8 bytes', async () => {
    expect(await toBytes('ñ')).toEqual(new Uint8Array([0xC3, 0xB1]))
  })

  test('bytes are kept as they are, the same array', async () => {
    const bytes = new Uint8Array([1, 2, 3])

    expect(await toBytes(bytes)).toBe(bytes)
  })

  test('a blob is read to its bytes', async () => {
    expect(await toBytes(new Blob([new Uint8Array([4, 5])]))).toEqual(new Uint8Array([4, 5]))
  })
})
