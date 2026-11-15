import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { streamOf } from './stream-of'

describe('streamOf', () => {
  test('streams the bytes it is given, and says so only once it is read', async () => {
    let read = false
    const stream = streamOf(Promise.resolve(new TextEncoder().encode('hello')), () => {
      read = true
    })

    expect(read).toBe(false)
    expect(await new Response(stream).text()).toBe('hello')
    expect(read).toBe(true)
  })

  test('a failed read is the stream\'s error', async () => {
    await expect(new Response(streamOf(Promise.reject(new Error('gone')))).text()).rejects.toThrow('gone')
  })
})
