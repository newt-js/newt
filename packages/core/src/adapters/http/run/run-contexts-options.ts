import { BoundedContext }    from '../../../application/context/bounded-context/bounded-context'
import { Platform }          from '../../../application/platform/platform/platform'
import { HttpRouter }        from '../router/http-router/http-router'
import type { ServeOptions } from '../serve/serve-options'

export type RunContextsOptions = {
  signals?: boolean
  stopTimeoutMs?: number
  serve?: Omit<ServeOptions, 'routers'>
  platformWithoutContexts?: Platform
}

export type ContextToRun = {
  context: Pick<BoundedContext, 'name' | 'base' | 'start' | 'stopWorker' | 'close'>
  serve?: ServeOptions
  router?: HttpRouter
  app?: string | Bun.HTMLBundle
  host?: string | undefined
}

export type RunningContexts = {
  servers: Record<string, Bun.Server<undefined>>
  server?: Bun.Server<undefined>
  stop(): Promise<void>
}
