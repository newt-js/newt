import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { withParams } from '../../request/with-params/with-params'
import { withCors }   from './with-cors'

const request = withParams(new Request('http://app.test/', { headers: { origin: 'https://a.test' } }), {})

describe('withCors', () => {
  test('says in the answer what a page of that origin may read', async () => {
    const answer = await withCors(() => new Response('ok', { headers: { vary: 'Accept' } }), { origin: ['https://a.test'] })(request)

    expect([answer.headers.get('access-control-allow-origin'), answer.headers.get('vary')]).toEqual(['https://a.test', 'Accept, origin'])
  })

  test('without cors, the route is as it was', () => {
    const route = () => new Response('ok')

    expect(withCors(route, undefined)).toBe(route)
  })
})
