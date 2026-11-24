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
  router?: HttpRouter
  app?: string | Bun.HTMLBundle
  host?: string | undefined
  /** Whether it answers at every subdomain of its host too: auth, whose applications each have their own. */
  subdomains?: boolean
}

export type RunningContexts = {
  server?: Bun.Server<undefined>
  /** One of its contexts, by its name: its tests read what it sent or stored. */
  context(name: string): ContextToRun['context']
  stop(): Promise<void>
}
