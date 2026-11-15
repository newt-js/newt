import { describe }        from 'bun:test'
import { expect }          from 'bun:test'
import { test }            from 'bun:test'
// --------------------------------------------------------
import { PayloadTooLarge } from './payload-too-large'

describe('PayloadTooLarge', () => {
  test('is a too_large error that says why', () => {
    const error = new PayloadTooLarge(1024)

    expect([error.kind, error.code]).toEqual(['too_large', 'payload_too_large'])
    expect(error.message).toBe('The body is longer than the 1024 bytes it may be')
    expect(error.params).toEqual({ maxBytes: 1024 })
  })
})
