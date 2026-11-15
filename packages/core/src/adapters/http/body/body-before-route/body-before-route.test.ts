import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { PayloadTooLarge } from '../../errors/payload-too-large/payload-too-large'
import { limitBody }       from '../limit-body/limit-body'
import { bodyBeforeRoute } from './body-before-route'

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes)
const post = (body: RequestInit['body']) => new Request('http://app.test/api/things', { method: 'POST', body })

describe('bodyBeforeRoute', () => {
  test('reads the bytes and leaves them for the route to read again', async () => {
    const request = post('hello')

    expect(text(await bodyBeforeRoute(request))).toBe('hello')
    expect(await request.text()).toBe('hello')
  })

  test('of a body held to a length, those bytes, refused past it', async () => {
    const held = post(new Blob(['hello']).stream())
    const long = post(new Blob(['x'.repeat(100)]).stream())
    limitBody(held, 10)
    limitBody(long, 10)

    expect(text(await bodyBeforeRoute(held))).toBe('hello')
    expect(await held.text()).toBe('hello')
    await expect(bodyBeforeRoute(long)).rejects.toThrow(PayloadTooLarge)
  })

  test('no body is no bytes', async () => {
    expect((await bodyBeforeRoute(post(null))).byteLength).toBe(0)
  })
})
