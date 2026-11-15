import { BoundedContext } from '../../../application/context/bounded-context/bounded-context'
import { HttpRouter }     from '../router/http-router/http-router'
import { ServeOptions }   from '../serve/serve-options'

export type RunContextsOptions = {
  signals?: boolean
  stopTimeoutMs?: number
  serve?: Omit<ServeOptions, 'routers'>
}

export type ContextToRun = {
  context: Pick<BoundedContext, 'name' | 'base' | 'start' | 'stopWorker' | 'close'>
  serve?: ServeOptions
  router?: HttpRouter
}

export type RunningContexts = {
  servers: Record<string, Bun.Server<undefined>>
  server?: Bun.Server<undefined>
  stop(): Promise<void>
}
