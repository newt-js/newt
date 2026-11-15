import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { bodyOf }   from './body-of'

describe('bodyOf', () => {
  test('is the JSON the client sent, as it came', async () => {
    const request = new Request('http://app.test/api/things', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"title":"a","extra":1}' })

    expect(await bodyOf(request)).toEqual({ title: 'a', extra: 1 })
  })
})
