export const SRC_BACKEND_TEST_TS = `import { expect, test } from 'bun:test'
import { startBackend } from './backend'

test('the backend answers its health', async () => {
  const backend = await startBackend(0, { stores: 'memory' })
  const response = await fetch(new URL('/health-check', backend.server!.url))
  expect(response.status).toBe(200)
  await backend.stop()
})
`
