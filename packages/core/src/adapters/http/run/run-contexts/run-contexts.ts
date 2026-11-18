import { log }                     from '../../../../application/platform/log/log'
import { platformScope }           from '../../../../application/platform/platform-scope/platform-scope'
import { ABORTED_GRACE_MS }        from '../../../../application/runtime/worker/worker/worker'
import { mountsOf }                from '../../serve/mounts-of/mounts-of'
import { serve }                   from '../../serve/serve/serve'
import { platformToRun }           from '../platform-to-run/platform-to-run'
import type { ContextToRun }       from '../run-contexts-options'
import type { RunContextsOptions } from '../run-contexts-options'
import type { RunningContexts }    from '../run-contexts-options'
import { sharedRouters }           from '../shared-routers/shared-routers'
import { stopServer }              from '../stop-server/stop-server'

const SIGNALS = ['SIGINT', 'SIGTERM'] as const
const STOP_TIMEOUT_MS = 8_000
const CLOSE_TIMEOUT_MS = 10_000

export function runContexts(contexts: ContextToRun[], options: RunContextsOptions = {}): RunningContexts {
  const platform = platformToRun(contexts, options.platformWithoutContexts)
  const shared = options.serve ? sharedRouters(contexts) : []
  const servers: Record<string, Bun.Server<undefined>> = {}
  let server: Bun.Server<undefined> | undefined
  try {
    for (const { context, serve: served } of contexts) {
      if (served) {
        servers[context.name] = serve(served)
      }
    }
    if (options.serve) {
      const served = contexts.filter(({ router }) => router).map(({ context }) => context.name)
      const apps = contexts.flatMap(({ context, app }) => app ? [{ path: `/${context.name}`, app }] : [])
      const frontend = [...mountsOf(options.serve.frontend, options.serve.publicFolder), ...apps]
      server = serve({ ...options.serve, routers: shared, healthContexts: served, frontend })
    }
  } catch (error) {
    for (const each of Object.values(servers)) {
      void each.stop(true)
    }
    throw error
  }
  for (const { context } of contexts) {
    context.start()
  }

  const stopTimeoutMs = options.stopTimeoutMs ?? STOP_TIMEOUT_MS
  let stopped: Promise<void> | null = null
  const onSignal = () => {
    const drainMs = Math.max(0, options.serve?.drainMs ?? 0, ...contexts.map(({ serve }) => serve?.drainMs ?? 0))
    setTimeout(() => platformScope.run(platform, () => {
      log.error('[runContexts] the stop outlived its deadlines: the process ends without it')
      process.exit(1)
    }), drainMs + 2 * stopTimeoutMs + ABORTED_GRACE_MS + CLOSE_TIMEOUT_MS)
    void running.stop().then(() => 0, () => 1).then(code => process.exit(code))
  }
  const running: RunningContexts = {
    servers,
    ...(server ? { server } : {}),
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
      await Promise.all([
        ...contexts.filter(({ serve }) => serve).map(({ context, serve }) =>
          step(`stopping ${context.name}'s server`, () => stopServer(servers[context.name]!, (serve!.drainMs ?? 0) + stopTimeoutMs))),
        ...server ? [step('stopping the server', () => stopServer(server, (options.serve?.drainMs ?? 0) + stopTimeoutMs))] : [],
      ])
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
