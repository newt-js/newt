import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { requestHost }     from '../request-host/request-host'
import { noteRequestHost } from './note-request-host'

const hostOf = (trustProxy: number, forwarded: string) => {
  const request = new Request('http://shop.test/', { headers: { host: 'internal.lan', 'x-forwarded-host': forwarded } })
  noteRequestHost(request, trustProxy)
  return requestHost(request)
}

describe('noteRequestHost', () => {
  test('without a trusted proxy, nobody vouches for X-Forwarded-Host: Host decides', () => {
    expect(hostOf(0, 'shop.example')).toBe('internal.lan')
  })

  test('behind trusted proxies, the host the first of them was asked for, in lower case', () => {
    expect(hostOf(1, 'Shop.Example')).toBe('shop.example')
    expect(hostOf(2, 'evil.test, shop.example, internal.lan')).toBe('shop.example')
  })
})
