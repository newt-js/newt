import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { withParams } from './with-params'

describe('withParams', () => {
  test('gives the request its params, and its cookies read from its header', () => {
    const request = withParams<'/things/:id'>(new Request('http://app.test/things/7', { headers: { cookie: 'session=ana; theme=dark' } }), { id: '7' })

    expect(request.params.id).toBe('7')
    expect([request.cookies.get('session'), request.cookies.get('theme')]).toEqual(['ana', 'dark'])
  })

  test('a request without cookies has none', () => {
    expect(withParams(new Request('http://app.test/'), {}).cookies.size).toBe(0)
  })
})
