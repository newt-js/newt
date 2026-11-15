import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { PayloadTooLarge } from '../../errors/payload-too-large/payload-too-large'
import { limitBody }       from './limit-body'

function streamed(text: string): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text)
  return new ReadableStream({
    start(controller) {
      for (let at = 0; at < bytes.length; at += 1024) {
        controller.enqueue(bytes.slice(at, at + 1024))
      }
      controller.close()
    },
  })
}

const post = (body: RequestInit['body'], headers: Record<string, string> = {}) => new Request('http://app.test/api/things', { method: 'POST', headers, body })

describe('limitBody', () => {
  test('a body whose length says it is too long is refused at once', () => {
    expect(() => limitBody(post('x'.repeat(10), { 'content-length': '5000' }), 100)).toThrow(PayloadTooLarge)
  })

  test('a body sent with no length is refused as it is read, however it is read', async () => {
    const text = post(streamed('x'.repeat(5000)), { 'content-type': 'text/plain' })
    const form = post(streamed(`name=${'x'.repeat(5000)}`), { 'content-type': 'application/x-www-form-urlencoded' })
    limitBody(text, 2048)
    limitBody(form, 2048)

    await expect(text.text()).rejects.toThrow(PayloadTooLarge)
    await expect(form.formData()).rejects.toThrow(PayloadTooLarge)
  })

  test('one within it is read as it would be', async () => {
    const json = post(streamed('{"a":1}'))
    const form = post(streamed('name=ana'), { 'content-type': 'application/x-www-form-urlencoded' })
    limitBody(json, 2048)
    limitBody(form, 2048)

    expect(await json.json()).toEqual({ a: 1 })
    expect((await form.formData()).get('name')).toBe('ana')
  })

  test('it is read once, as any body: a second read fails', async () => {
    const request = post(streamed('hello'))
    limitBody(request, 2048)

    expect(await request.text()).toBe('hello')
    expect(request.bodyUsed).toBe(true)
    await expect(request.text()).rejects.toThrow('Body already used')
  })

  test('a copy keeps its bytes and its params', async () => {
    const request = post(streamed('hello'))
    Object.defineProperty(request, 'params', { value: { id: '7' } })
    limitBody(request, 2048)

    const copy = request.clone()

    expect((copy as Request & { params: unknown }).params).toEqual({ id: '7' })
    expect([await copy.text(), await request.text()]).toEqual(['hello', 'hello'])
  })

  test('its stream may be passed on whole', async () => {
    const request = post(streamed('hello'))
    limitBody(request, 2048)

    expect(await new Response(request.body).text()).toBe('hello')
  })

  test('its stream is held to the limit too', async () => {
    const request = post(streamed('x'.repeat(5000)))
    limitBody(request, 2048)

    await expect(new Response(request.body).text()).rejects.toThrow(PayloadTooLarge)
  })

  test('a body still reads once its stream has been looked at', async () => {
    const json = post(streamed('{"a":1}'))
    const big = post(streamed('x'.repeat(5000)))
    limitBody(json, 2048)
    limitBody(big, 2048)

    expect(json.body).not.toBeNull()
    expect(big.body).not.toBeNull()

    expect(await json.json()).toEqual({ a: 1 })
    await expect(big.text()).rejects.toThrow(PayloadTooLarge)
  })

  test('a copy keeps its bytes once its stream has been looked at', async () => {
    const request = post(streamed('hello'))
    Object.defineProperty(request, 'params', { value: { id: '7' } })
    limitBody(request, 2048)
    void request.body

    const copy = request.clone()

    expect((copy as Request & { params: unknown }).params).toEqual({ id: '7' })
    expect([await copy.text(), await request.text()]).toEqual(['hello', 'hello'])
  })
})
