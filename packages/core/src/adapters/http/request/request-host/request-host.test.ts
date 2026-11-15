import { describe }     from 'bun:test'
import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { requestHost }  from './request-host'
import { requestHosts } from './request-hosts'

describe('requestHost', () => {
  test('is its Host, in lower case, or none', () => {
    expect(requestHost(new Request('http://app.test/', { headers: { host: 'Shop.Example' } }))).toBe('shop.example')
    expect(requestHost(new Request('http://app.test/'))).toBeNull()
  })

  test('is the host noted for it, behind a proxy, over its Host', () => {
    const request = new Request('http://app.test/', { headers: { host: 'internal.lan' } })
    requestHosts.set(request, 'Shop.Example')

    expect(requestHost(request)).toBe('shop.example')
  })
})
