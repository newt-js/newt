import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { PayloadTooLarge } from '../../errors/payload-too-large/payload-too-large'
import { limitedStream }   from './limited-stream'

describe('limitedStream', () => {
  test('passes the bytes on as they come, within the most it may', async () => {
    expect(await new Response(limitedStream(new Blob(['ab', 'cd']).stream(), 10)).text()).toBe('abcd')
  })

  test('fails once they pass it', async () => {
    await expect(new Response(limitedStream(new Blob(['x'.repeat(100)]).stream(), 10)).text()).rejects.toThrow(PayloadTooLarge)
  })
})
