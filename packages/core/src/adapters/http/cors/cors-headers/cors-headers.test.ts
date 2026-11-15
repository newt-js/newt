import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { corsHeaders } from './cors-headers'

const from = (origin?: string) => new Request('http://app.test/', { headers: origin ? { origin } : {} })

describe('corsHeaders', () => {
  test('a preflight says what a page may send, and for how long it is kept', () => {
    const headers = corsHeaders({ origin: '*', headers: ['authorization'] }, from('https://a.test'), ['GET', 'OPTIONS'])

    expect(headers).toEqual({
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET, OPTIONS',
      'access-control-allow-headers': 'authorization',
      'access-control-max-age': '86400',
    })
  })

  test('any other answer says what it may read', () => {
    expect(corsHeaders({ origin: ['https://a.test'], expose: ['etag'] }, from('https://a.test'))).toEqual({
      vary: 'origin',
      'access-control-allow-origin': 'https://a.test',
      'access-control-expose-headers': 'etag',
    })
  })

  test('an origin that is not listed, or none, gets only Vary', () => {
    expect(corsHeaders({ origin: ['https://a.test'] }, from('https://evil.test'))).toEqual({ vary: 'origin' })
    expect(corsHeaders({ origin: ['https://a.test'] }, from())).toEqual({ vary: 'origin' })
  })
})
