import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { queryOf }  from './query-of'

describe('queryOf', () => {
  test('is the query the client sent, each value a string', () => {
    expect(queryOf(new Request('http://app.test/api/stats?window=24h&size=5'))).toEqual({ window: '24h', size: '5' })
  })
})
