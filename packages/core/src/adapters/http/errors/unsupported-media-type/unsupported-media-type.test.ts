import { describe }             from 'bun:test'
import { expect }               from 'bun:test'
import { test }                 from 'bun:test'
// --------------------------------------------------------
import { UnsupportedMediaType } from './unsupported-media-type'

describe('UnsupportedMediaType', () => {
  test('is a unsupported_media_type error that says why', () => {
    const error = new UnsupportedMediaType()

    expect([error.kind, error.code]).toEqual(['unsupported_media_type', 'unsupported_media_type'])
    expect(error.message).toBe('The body is read as JSON: send it with content-type application/json')
  })
})
