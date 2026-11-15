import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { corsHeadersOver } from './cors-headers-over'

describe('corsHeadersOver', () => {
  test('joins the answer\'s lists with CORS\'s, each name once whatever its case', () => {
    const own = new Headers({ vary: 'Accept, Origin', 'access-control-expose-headers': 'ETag' })

    expect(corsHeadersOver(own, { vary: 'origin', 'access-control-expose-headers': 'etag, x-total' })).toEqual({
      vary: 'Accept, Origin',
      'access-control-expose-headers': 'ETag, x-total',
    })
  })

  test('a list that says * is * alone', () => {
    expect(corsHeadersOver(new Headers({ vary: '*' }), { vary: 'origin' })).toEqual({ vary: '*' })
  })

  test('who may call is CORS\'s alone: the answer\'s own are left out where CORS gives none', () => {
    const own = new Headers({ 'access-control-allow-origin': '*', 'access-control-allow-credentials': 'true' })

    expect(corsHeadersOver(own, { 'access-control-allow-origin': 'https://a.test' })).toEqual({
      'access-control-allow-origin': 'https://a.test',
      'access-control-allow-credentials': null,
    })
  })
})
