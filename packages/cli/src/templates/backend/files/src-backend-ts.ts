import type { ClusterTemplate } from '../clusters'

export function srcBackendTs(cluster: ClusterTemplate): string {
  return `import { Platform } from '@newt-js/core/application'
${cluster.importLines.join('\n')}
import { runContexts, type RunningContexts } from '@newt-js/core/http'
import { openContexts } from './contexts'
import type { Stores } from './stores'

/** The backend on \`port\`; its tests give it \`stores: 'memory'\`. */
export async function startBackend(port: number, { stores = 'configured' }: { stores?: Stores } = {}): Promise<RunningContexts> {
  const platform = new Platform({ cluster: ${cluster.expression} })
  const contexts = await openContexts(platform, stores)
  return runContexts(contexts, { platformWithoutContexts: platform, serve: { port, health: true } })
}
`
}
