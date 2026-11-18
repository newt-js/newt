import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { TooManyRequests } from '../../../../domain/errors/too-many-requests/too-many-requests'
import { retryAfter }      from './retry-after'

describe('retryAfter', () => {
  test('tells one who ran into a rate limit when to try again, in whole seconds; anyone else, nothing', () => {
    expect(retryAfter(new TooManyRequests('auth[session].signIn', 1500))).toEqual({ 'retry-after': '2' })
    expect(retryAfter(new Error('other'))).toEqual({})
  })
})
