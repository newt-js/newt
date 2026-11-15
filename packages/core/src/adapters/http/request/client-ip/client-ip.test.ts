import { describe }  from 'bun:test'
import { expect }    from 'bun:test'
import { test }      from 'bun:test'
// --------------------------------------------------------
import { clientIp }  from './client-ip'
import { clientIps } from './client-ips'

describe('clientIp', () => {
  test('is the address noted for the request, null for one nobody noted', () => {
    const noted = new Request('http://app.test/')
    clientIps.set(noted, '203.0.113.9')

    expect([clientIp(noted), clientIp(new Request('http://app.test/'))]).toEqual(['203.0.113.9', null])
  })
})
