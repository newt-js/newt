import type { ClusterTemplate } from '../clusters'

export function srcBackendTs(cluster: ClusterTemplate): string {
  return `import { Platform } from '@newt-js/core/application'
${cluster.importLine}
import { runContexts, type RunningContexts } from '@newt-js/core/http'
import { openContexts } from './contexts'

export async function startBackend(port: number): Promise<RunningContexts> {
  const platform = new Platform({ cluster: ${cluster.expression} })
  const contexts = await openContexts(platform)
  return runContexts(contexts, { platformWithoutContexts: platform, serve: { port, health: true } })
}
`
}
