import { describe }           from 'bun:test'
import { expect }             from 'bun:test'
import { test }               from 'bun:test'
// --------------------------------------------------------
import { CrossOriginRefused } from './cross-origin-refused'

describe('CrossOriginRefused', () => {
  test('is a forbidden error that says why', () => {
    const error = new CrossOriginRefused()

    expect([error.kind, error.code]).toEqual(['forbidden', 'cross_origin_refused'])
    expect(error.message).toBe('A page of another origin may not send this')
  })
})
