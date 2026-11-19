import type { ClusterTemplate } from '../clusters'

/** src/index.ts: the backend, as its tests start it, and its start when run as `bun src/index.ts`. */
export function srcIndexTs(cluster: ClusterTemplate): string {
  const options = cluster.expression === undefined ? '' : '{ cluster }'
  const clustered = cluster.expression === undefined ? '' : `  const cluster = ${cluster.expression}\n`
  return `import { Platform, type DataPlace } from '@newt-js/core/application'
${cluster.importLines.map(line => `${line}\n`).join('')}import { runContexts, type RunningContexts } from '@newt-js/core/http'
import { openContexts } from './contexts/contexts'

export async function startBackend(
  port: number,
  { data = 'configured' }: { data?: DataPlace } = {},
): Promise<RunningContexts> {
${clustered}  const platform = new Platform(${options})
  const contexts = await openContexts(platform, data)
  return runContexts(contexts, {
    platformWithoutContexts: platform,
    serve: { port },
  })
}

if (import.meta.main) {
  const running = await startBackend(Number(Bun.env.PORT || 3000))
  console.log(\`Listening on \${running.server?.url}\`)
}
`
}
