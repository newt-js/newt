import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { withHeaders } from './with-headers'

describe('withHeaders', () => {
  test('adds the headers the answer does not have: its own come first', () => {
    const response = withHeaders(new Response('ok', { headers: { 'referrer-policy': 'no-referrer' } }), { 'referrer-policy': 'strict-origin', 'x-frame-options': 'DENY' })

    expect([response.headers.get('referrer-policy'), response.headers.get('x-frame-options')]).toEqual(['no-referrer', 'DENY'])
  })

  test('an answer that has them all is the same answer', () => {
    const response = new Response('ok', { headers: { 'x-frame-options': 'SAMEORIGIN' } })

    expect(withHeaders(response, { 'x-frame-options': 'DENY' })).toBe(response)
  })
})
