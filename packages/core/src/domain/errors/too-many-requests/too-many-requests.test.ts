import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { TooManyRequests } from './too-many-requests'

describe('TooManyRequests', () => {
  test('says how long to wait, in whole seconds', () => {
    const error = new TooManyRequests('sign-in', 1500)

    expect([error.kind, error.code]).toEqual(['too_many_requests', 'too_many_requests'])
    expect(error.params).toEqual({ limit: 'sign-in', retryAfterSeconds: 2 })
    expect(error.message).toBe('Too many requests: try again in 2 s')
  })
})
