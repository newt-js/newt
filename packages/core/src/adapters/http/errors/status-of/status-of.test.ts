import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { statusOf } from './status-of'

describe('statusOf', () => {
  test('each kind of known error has its status', () => {
    const kinds = ['validation', 'unauthorized', 'forbidden', 'not_found', 'method_not_allowed', 'conflict', 'too_large', 'unsupported_media_type', 'unprocessable', 'too_many_requests']

    expect(kinds.map(statusOf)).toEqual([400, 401, 403, 404, 405, 409, 413, 415, 422, 429])
  })

  test('a kind it does not know has none', () => {
    expect(statusOf('weird')).toBeNull()
  })
})
