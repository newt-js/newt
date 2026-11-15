import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { stopServer } from './stop-server'

describe('stopServer', () => {
  test('closes a stream that never ends once its deadline passes', async () => {
    const server = Bun.serve({ port: 0, fetch: () => new Response(new ReadableStream({ start: controller => controller.enqueue(new TextEncoder().encode('live')) })) })
    const reader = (await fetch(server.url)).body!.getReader()
    await reader.read()
    const started = performance.now()

    await stopServer(server, 100)

    expect(performance.now() - started).toBeLessThan(1000)
    await reader.cancel().catch(() => {})
  })
})
