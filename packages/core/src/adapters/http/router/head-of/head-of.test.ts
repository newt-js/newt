import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { headOf }   from './head-of'

describe('headOf', () => {
  test('the answer\'s status and headers, without its body', async () => {
    const head = headOf(new Response('the body', { status: 201, statusText: 'Created', headers: { etag: '"1"' } }))

    expect([head.status, head.statusText, head.headers.get('etag')]).toEqual([201, 'Created', '"1"'])
    expect(head.body).toBeNull()
  })

  test('the body left behind is cancelled', async () => {
    let cancelled = false
    const body = new ReadableStream({ cancel: () => {
      cancelled = true
    } })

    headOf(new Response(body))
    await Bun.sleep(0)

    expect(cancelled).toBe(true)
  })
})
