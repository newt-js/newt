import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { requestHosts }  from '../../request/request-host/request-hosts'
import { fromOwnOrigin } from './from-own-origin'

const sent = (headers: Record<string, string>) => new Request('http://shop.test/api/cards', { method: 'POST', headers: { host: 'shop.test', ...headers } })

describe('fromOwnOrigin', () => {
  test('a browser that says so: from its own pages, or by the person by hand', () => {
    expect(fromOwnOrigin(sent({ 'sec-fetch-site': 'same-origin' }))).toBe(true)
    expect(fromOwnOrigin(sent({ 'sec-fetch-site': 'none' }))).toBe(true)
    expect(fromOwnOrigin(sent({ 'sec-fetch-site': 'same-site', origin: 'http://shop.test' }))).toBe(false)
    expect(fromOwnOrigin(sent({ 'sec-fetch-site': 'cross-site' }))).toBe(false)
  })

  test('from no page at all', () => {
    expect(fromOwnOrigin(sent({}))).toBe(true)
  })

  test('an older browser, by its Origin against the host it asked for', () => {
    expect(fromOwnOrigin(sent({ origin: 'http://SHOP.test' }))).toBe(true)
    expect(fromOwnOrigin(sent({ origin: 'https://evil.test' }))).toBe(false)
    expect(fromOwnOrigin(sent({ origin: 'not a url' }))).toBe(false)
  })

  test('behind a proxy, against the host the proxy was asked for', () => {
    const request = sent({ origin: 'https://shop.example' })
    requestHosts.set(request, 'shop.example')

    expect(fromOwnOrigin(request)).toBe(true)
  })
})
