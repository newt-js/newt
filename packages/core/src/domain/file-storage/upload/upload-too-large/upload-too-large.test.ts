import { describe }       from 'bun:test'
import { expect }         from 'bun:test'
import { test }           from 'bun:test'
// --------------------------------------------------------
import { UploadTooLarge } from './upload-too-large'

describe('UploadTooLarge', () => {
  test('is too large, and says how much it may be', () => {
    const error = new UploadTooLarge(1024)

    expect(error.kind).toBe('too_large')
    expect(error.code).toBe('upload_too_large')
    expect(error.message).toBe('The file is longer than the 1024 bytes it may be')
    expect(error.params).toEqual({ maxBytes: 1024 })
  })
})
