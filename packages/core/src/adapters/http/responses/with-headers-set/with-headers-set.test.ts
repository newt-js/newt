import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
// --------------------------------------------------------
import { withHeadersSet } from './with-headers-set'

describe('withHeadersSet', () => {
  test('sets the headers over its own, and keeps its status, its status text and its other headers', async () => {
    const response = new Response('made', { status: 201, statusText: 'Made', headers: { 'content-type': 'text/plain', 'x-kept': 'yes', 'x-told': 'before' } })

    const told = withHeadersSet(response, { 'x-told': 'after', 'x-new': 'new' })

    expect([told.status, told.statusText]).toEqual([201, 'Made'])
    expect(Object.fromEntries(told.headers)).toEqual({ 'content-type': 'text/plain', 'x-kept': 'yes', 'x-told': 'after', 'x-new': 'new' })
    expect(await told.text()).toBe('made')
  })

  test('a header given null is left out of the copy, and the answer given is left as it was', () => {
    const response = new Response('made', { headers: { 'x-gone': 'yes', 'x-kept': 'yes' } })

    const told = withHeadersSet(response, { 'x-gone': null, 'x-absent': null })

    expect(told.headers.has('x-gone')).toBe(false)
    expect(told.headers.get('x-kept')).toBe('yes')
    expect(response.headers.get('x-gone')).toBe('yes')
  })

  test('the copy streams the body as it comes: it is not read first', async () => {
    let pulled = 0
    const body = new ReadableStream<Uint8Array>({
      pull: controller => {
        pulled++
        controller.enqueue(new TextEncoder().encode(`chunk ${pulled};`))
        if (pulled === 3) {
          controller.close()
        }
      },
    }, { highWaterMark: 0 })
    const response = new Response(body)

    const told = withHeadersSet(response, { 'x-told': 'yes' })

    expect(pulled).toBe(0)
    expect(await told.text()).toBe('chunk 1;chunk 2;chunk 3;')
  })

  test('a redirect, whose headers cannot change, is answered as a copy that has them', () => {
    const redirect = Response.redirect('https://elsewhere.test/', 302)

    const told = withHeadersSet(redirect, { 'x-told': 'yes' })

    expect([told.status, told.headers.get('location'), told.headers.get('x-told')]).toEqual([302, 'https://elsewhere.test/', 'yes'])
    expect(redirect.headers.has('x-told')).toBe(false)
  })

  test.each([101, 204, 304])('an answer of %d, which has no body, keeps its status and has none', status => {
    const told = withHeadersSet(new Response(null, { status }), { 'x-told': 'yes' })

    expect([told.status, told.body, told.headers.get('x-told')]).toEqual([status, null, 'yes'])
  })
})
