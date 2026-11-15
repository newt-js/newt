import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
import { createHmac } from 'node:crypto'
// --------------------------------------------------------
import { hmac }       from './hmac'

describe('hmac', () => {
  test('signs with SHA-256 under a key of text', () => {
    expect(Buffer.from(hmac('key', 'text')).toString('hex')).toBe(createHmac('sha256', 'key').update('text').digest('hex'))
  })

  test('takes a key of bytes, as a signature chain gives it', () => {
    const key = hmac('AWS4secret', '20130524')

    expect(Buffer.from(hmac(key, 'us-east-1')).toString('hex')).toBe(createHmac('sha256', key).update('us-east-1').digest('hex'))
  })
})
