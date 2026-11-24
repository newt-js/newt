import { log }                     from '../../../../application/platform/log/log'
import { platformScope }           from '../../../../application/platform/platform-scope/platform-scope'
import { ABORTED_GRACE_MS }        from '../../../../application/runtime/worker/worker/worker'
import { mountsOf }                from '../../serve/mounts-of/mounts-of'
import { serveContexts }           from '../../serve/serve-contexts/serve-contexts'
import { hostsOf }                 from '../hosts-of/hosts-of'
import { platformToRun }           from '../platform-to-run/platform-to-run'
import { routersOf }               from '../routers-of/routers-of'
import type { ContextToRun }       from '../run-contexts-options'
import type { RunContextsOptions } from '../run-contexts-options'
import type { RunningContexts }    from '../run-contexts-options'
import { stopServer }              from '../stop-server/stop-server'

const SIGNALS = ['SIGINT', 'SIGTERM'] as const
const STOP_TIMEOUT_MS = 8_000
const CLOSE_TIMEOUT_MS = 10_000

export function runContexts(contexts: ContextToRun[], options: RunContextsOptions = {}): RunningContexts {
  const platform = platformToRun(contexts, options.platformWithoutContexts)
  const routers = options.serve ? routersOf(contexts) : []
  let server: Bun.Server<undefined> | undefined
  if (options.serve) {
    const health = contexts.filter(({ router }) => router).map(({ context }) => context.name)
    const apps = contexts.flatMap(({ context, app }) => app ? [{ path: `/${context.name}`, app }] : [])
    const frontend = [...mountsOf(options.serve.frontend, options.serve.publicFolder), ...apps]
    server = serveContexts({ ...options.serve, health: options.serve.health ?? true, routers, frontend }, { health, hosts: hostsOf(contexts) })
  }
  for (const { context } of contexts) {
    context.start()
  }

  const stopTimeoutMs = options.stopTimeoutMs ?? STOP_TIMEOUT_MS
  let stopped: Promise<void> | null = null
  const onSignal = () => {
    const drainMs = options.serve?.drainMs ?? 0
    setTimeout(() => platformScope.run(platform, () => {
      log.error('[runContexts] the stop outlived its deadlines: the process ends without it')
      process.exit(1)
    }), drainMs + 2 * stopTimeoutMs + ABORTED_GRACE_MS + CLOSE_TIMEOUT_MS)
    void running.stop().then(() => 0, () => 1).then(code => process.exit(code))
  }
  const running: RunningContexts = {
    ...(server ? { server } : {}),
    context: name => {
      const found = contexts.find(({ context }) => context.name === name)
      if (!found) throw new Error(`No context named ${name} is running`)
      return found.context
    },
    stop: () => stopped ??= platformScope.run(platform, async () => {
      if (options.signals !== false) {
        for (const signal of SIGNALS) {
          process.off(signal, onSignal)
        }
      }
      const failures: unknown[] = []
      const step = async (what: string, run: () => Promise<unknown>) => {
        try {
          await run()
        } catch (error) {
          failures.push(error)
          log.error(`[runContexts] ${what} failed, the stop goes on`, { error })
        }
      }
      if (server) {
        await step('stopping the server', () => stopServer(server, (options.serve?.drainMs ?? 0) + stopTimeoutMs))
      }
      await Promise.all(contexts.map(({ context }) => step(`stopping ${context.name}'s worker`, () => context.stopWorker(stopTimeoutMs))))
      for (const { context } of contexts.toReversed()) {
        await step(`closing ${context.name}`, () => context.close())
      }
      if (failures.length > 0) {
        throw new AggregateError(failures, `${failures.length} step(s) of the stop failed`)
      }
    }),
  }
  if (options.signals !== false) {
    for (const signal of SIGNALS) {
      process.on(signal, onSignal)
    }
  }
  return running
}
