import { serveContexts }     from '../serve-contexts/serve-contexts'
import type { ServeOptions } from '../serve-options'

export function serve(options: ServeOptions): Bun.Server<undefined> {
  return serveContexts(options, { health: [], hosts: {} })
}
