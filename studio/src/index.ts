import type { DataPlace }       from '@newt-js/core/application'
import { Platform }             from '@newt-js/core/application'
import type { RunningContexts } from '@newt-js/core/http'
import { runContexts }          from '@newt-js/core/http'
// --------------------------------------------------------
import { openContexts }         from './contexts/contexts'

export async function startBackend(
  port: number,
  { data = 'configured' }: { data?: DataPlace } = {},
): Promise<RunningContexts> {
  const platform = new Platform()
  const contexts = await openContexts(platform, data)
  return runContexts(contexts, {
    platformWithoutContexts: platform,
    serve: { port },
  })
}

if (import.meta.main) {
  const running = await startBackend(Number(Bun.env.PORT || 3000))
  console.log(`Listening on ${running.server?.url}`)
}
