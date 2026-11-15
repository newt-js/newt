import { describe }           from 'bun:test'
import { expect }             from 'bun:test'
import { test }               from 'bun:test'
// --------------------------------------------------------
import { Cors }               from '../../cors/cors'
import { CrossOriginRefused } from '../../errors/cross-origin-refused/cross-origin-refused'
import { requestHosts }       from '../../request/request-host/request-hosts'
import { withParams }         from '../../request/with-params/with-params'
import { sameOrigin }         from './same-origin'

const ok = () => new Response(null, { status: 204 })

function send(headers: Record<string, string>, cors?: Cors) {
  const request = withParams(new Request('http://shop.test/api/cards', { method: 'POST', headers: { host: 'shop.test', ...headers } }), {})
  return () => sameOrigin(ok, cors)(request)
}

const SITE = (site: string) => ({ 'sec-fetch-site': site })

describe('sameOrigin', () => {
  test('a write a page of another site sends is refused, cookies or not', () => {
    for (const site of ['cross-site', 'same-site']) {
      expect(send(SITE(site))).toThrow(CrossOriginRefused)
      expect(send({ ...SITE(site), cookie: 'session=ana' })).toThrow(CrossOriginRefused)
    }
  })

  test('its own pages write, and so does the person by hand, and whoever sends from no page', () => {
    expect(send(SITE('same-origin'))).not.toThrow()
    expect(send(SITE('none'))).not.toThrow()
    expect(send({})).not.toThrow()
  })

  test('without Sec-Fetch-Site, an older browser\'s Origin decides: its own host, or refused', () => {
    expect(send({ origin: 'http://shop.test' })).not.toThrow()
    expect(send({ origin: 'https://evil.test' })).toThrow(CrossOriginRefused)
    expect(send({ origin: 'null' })).toThrow(CrossOriginRefused)
  })

  test('its Origin is checked against the host noted behind a proxy', () => {
    const request = withParams(new Request('http://internal.lan/api/cards', { method: 'POST', headers: { host: 'internal.lan', origin: 'https://shop.example' } }), {})
    requestHosts.set(request, 'Shop.Example')

    expect(() => sameOrigin(ok, undefined)(request)).not.toThrow()
  })

  test('an origin its cors names gets through, but never with cookies', () => {
    const cors: Cors = { origin: ['https://inspector.test'] }
    const elsewhere = { ...SITE('cross-site'), origin: 'https://inspector.test' }

    expect(send(elsewhere, cors)).not.toThrow()
    expect(send({ ...elsewhere, origin: 'https://evil.test' }, cors)).toThrow(CrossOriginRefused)
    expect(send({ ...elsewhere, cookie: 'session=ana' }, cors)).toThrow(CrossOriginRefused)
    expect(send({ origin: 'https://sibling.shop.test', cookie: 'session=ana' }, { origin: '*' })).toThrow(CrossOriginRefused)
  })
})
