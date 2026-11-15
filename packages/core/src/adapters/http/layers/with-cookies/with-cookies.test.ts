import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { withParams }  from '../../request/with-params/with-params'
import { withCookies } from './with-cookies'

describe('withCookies', () => {
  test('the cookies a route set or deleted go out in its answer, one Set-Cookie each', async () => {
    const request = withParams(new Request('http://shop.test/', { headers: { cookie: 'old=1' } }), {})

    const response = await withCookies(each => {
      each.cookies.set('a', '1')
      each.cookies.delete('old')
      return new Response('ok')
    })(request)

    expect(response.headers.getSetCookie()).toEqual([expect.stringMatching(/^a=1/), expect.stringMatching(/^old=;/)])
  })

  test('a route that set none answers as it was', async () => {
    const answer = new Response('ok')

    expect(await withCookies(() => answer)(withParams(new Request('http://shop.test/', { headers: { cookie: 'a=1' } }), {}))).toBe(answer)
  })
})
