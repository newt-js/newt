export const FRONTENDS_START = 'export const frontends: FrontendMount[] = ['

export const SRC_FRONTENDS_TS = `import type { FrontendMount } from '@newt-js/core/http'

${FRONTENDS_START}
]
`

export const SRC_FRONTENDS_TEST_TS = `import { expect, test } from 'bun:test'
import { join } from 'node:path'
import { startBackend } from './backend'
import { frontends } from './frontends'

test('the backend serves the page of every frontend, of those built elsewhere the ones built already', async () => {
  const backend = await startBackend(0, { stores: 'memory' })
  for (const { path, app } of frontends) {
    if (typeof app !== 'string' || await Bun.file(join(app, 'index.html')).exists()) {
      const response = await fetch(new URL(path, backend.server!.url))
      expect(response.headers.get('content-type')).toContain('text/html')
    }
  }
  await backend.stop()
})
`

export const SERVED = '  return runContexts(contexts, { platformWithoutContexts: platform, serve: { port, health: true } })'

export const SERVED_WITH_FRONTENDS = '  return runContexts(contexts, { platformWithoutContexts: platform, serve: { port, health: true, frontend: frontends } })'
