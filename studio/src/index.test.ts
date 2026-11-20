import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { startBackend } from './index'

test('the backend answers its health', async () => {
  Bun.env.AUTH_SIGNING_KEYS_SECRET ??= Buffer.alloc(32, 1).toString('base64url')
  const backend = await startBackend(0, { data: 'memory' })
  const response = await fetch(new URL('/health-check', backend.server!.url))
  expect(response.status).toBe(200)
  await backend.stop()
})
