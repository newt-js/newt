import { describe }  from 'bun:test'
import { expect }    from 'bun:test'
import { test }      from 'bun:test'
// --------------------------------------------------------
import { bytesUpTo } from './bytes-up-to'

describe('bytesUpTo', () => {
  test('an answer\'s bytes, if they are the most it may at most', async () => {
    const read = await bytesUpTo(new Response(new Blob(['ab', 'cd'])), 10)

    expect('bytes' in read && new TextDecoder().decode(read.bytes)).toBe('abcd')
    expect(await bytesUpTo(new Response(null, { status: 204 }), 10)).toEqual({ bytes: new Uint8Array() })
  })

  test('a longer one is the whole answer again, what was read of it first, with its status and headers', async () => {
    const read = await bytesUpTo(new Response(new Blob(['x'.repeat(20), 'y']), { status: 201, headers: { 'x-a': '1' } }), 10)

    expect('whole' in read).toBe(true)
    const whole = (read as { whole: Response }).whole
    expect([whole.status, whole.headers.get('x-a'), await whole.text()]).toEqual([201, '1', `${'x'.repeat(20)}y`])
  })
})
