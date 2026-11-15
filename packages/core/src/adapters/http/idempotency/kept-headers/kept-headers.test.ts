import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { keptHeaders } from './kept-headers'

describe('keptHeaders', () => {
  test('only the headers that describe the answer, whatever their case', () => {
    const headers = new Headers({ 'Content-Type': 'application/json', etag: '"1"', 'set-cookie': 'session=ana', 'ratelimit-remaining': '3', location: '/things/1' })

    expect(keptHeaders(headers)).toEqual([['content-type', 'application/json'], ['etag', '"1"'], ['location', '/things/1']])
    expect(keptHeaders([['Retry-After', '5'], ['X-Other', 'no']])).toEqual([['Retry-After', '5']])
  })
})
