import { expect }       from 'bun:test'
import { test }         from 'bun:test'
// --------------------------------------------------------
import { startBackend } from './index'

test('the backend answers its health', async () => {
  const backend = await startBackend(0, { data: 'memory' })
  const response = await fetch(new URL('/health-check', backend.server!.url))
  expect(response.status).toBe(200)
  await backend.stop()
})
