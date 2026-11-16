export const SRC_BACKEND_TS = `import { Platform } from '@newt-js/core/application'
import { MemoryCluster } from '@newt-js/core/cluster/memory'
import { runContexts, type RunningContexts } from '@newt-js/core/http'
import { openContexts } from './contexts'

export async function startBackend(port: number): Promise<RunningContexts> {
  const platform = new Platform({ cluster: new MemoryCluster() })
  const contexts = await openContexts(platform)
  return runContexts(contexts, { platformWithoutContexts: platform, serve: { port, health: true } })
}
`
