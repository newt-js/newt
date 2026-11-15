import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { withParams } from '../../request/with-params/with-params'
import { noStore }    from './no-store'

const request = withParams(new Request('http://shop.test/'), {})

describe('noStore', () => {
  test('an answer no cache keeps, unless it says how itself', async () => {
    expect((await noStore(() => new Response('ok'))(request)).headers.get('cache-control')).toBe('no-store')
    expect((await noStore(() => new Response('ok', { headers: { 'cache-control': 'max-age=60' } }))(request)).headers.get('cache-control')).toBe('max-age=60')
  })
})
