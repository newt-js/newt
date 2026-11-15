import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { pageRequestFrom } from './page-request-from'

const request = (query: string) => new Request(`http://app.test/api/things${query}`)

describe('pageRequestFrom', () => {
  test('20 items from the start by default', () => {
    expect(pageRequestFrom(request(''))).toEqual({ size: 20, cursor: undefined })
  })

  test('reads the size and the cursor', () => {
    expect(pageRequestFrom(request('?size=5&cursor=abc'))).toEqual({ size: 5, cursor: 'abc' })
  })

  test('keeps the size between 1 and 100', () => {
    expect([request('?size=0'), request('?size=-5'), request('?size=5000'), request('?size=lots')].map(each => pageRequestFrom(each).size)).toEqual([1, 1, 100, 20])
  })

  test('an empty cursor is none', () => {
    expect(pageRequestFrom(request('?cursor=')).cursor).toBeUndefined()
  })
})
