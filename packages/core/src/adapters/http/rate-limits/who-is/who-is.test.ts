import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { RateLimits }    from '../../../../application/runtime/rate-limits/rate-limits/rate-limits'
import { runAsActor }    from '../../../../domain/actor/run-as-actor/run-as-actor'
import { systemClock }   from '../../../../domain/clock/system-clock/system-clock'
import { MemoryCluster } from '../../../cluster/memory/memory-cluster/memory-cluster'
import { clientIps }     from '../../request/client-ip/client-ips'
import { withParams }    from '../../request/with-params/with-params'
import { whoIs }         from './who-is'

const limit = new RateLimits(new MemoryCluster(), 'shop', systemClock).define('api.calls', { limit: 5, windowMs: 60_000 })

function from(ip: string | null) {
  const request = withParams(new Request('http://shop.test/api/things', { headers: { 'x-key': 'abc' } }), {})
  if (ip) {
    clientIps.set(request, ip)
  }
  return request
}

describe('whoIs', () => {
  test('by default, the person signed in, or else the address it comes from', () => {
    expect(runAsActor({ userId: 'ana' }, () => whoIs({ limit }, from('1.1.1.1')))).toBe('actor:ana')
    expect(whoIs({ limit }, from('1.1.1.1'))).toBe('ip:1.1.1.1')
    expect(whoIs({ limit }, from(null))).toBe('ip:unknown')
  })

  test('by ip, the address even when someone is signed in', () => {
    expect(runAsActor({ userId: 'ana' }, () => whoIs({ limit, by: 'ip' }, from('2.2.2.2')))).toBe('ip:2.2.2.2')
  })

  test('by a key of its own, that key; none, and the request is not counted', () => {
    expect(whoIs({ limit, by: request => request.headers.get('x-key') }, from('1.1.1.1'))).toBe('key:abc')
    expect(whoIs({ limit, by: () => null }, from('1.1.1.1'))).toBeNull()
  })
})
