import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { PayloadTooLarge } from '../../errors/payload-too-large/payload-too-large'
import { readUpTo }        from './read-up-to'

const streamOf = (...chunks: string[]) => new Blob(chunks).stream()

describe('readUpTo', () => {
  test('gives the bytes of every chunk, in order', async () => {
    expect(new TextDecoder().decode(await readUpTo(streamOf('ab', 'cd'), 10))).toBe('abcd')
  })

  test('refuses them once they pass the most it may read', async () => {
    await expect(readUpTo(streamOf('abc', 'def'), 5)).rejects.toThrow(PayloadTooLarge)
  })
})
