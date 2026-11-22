import { prefixOf }           from '../prefix-of/prefix-of'
import type { FrontendMount } from '../serve-options'
import type { ServeOptions }  from '../serve-options'

export function mountsOf(frontend: ServeOptions['frontend'], publicFolder: string | undefined): Array<FrontendMount & { prefix: string }> {
  if (frontend === undefined) {
    return []
  }
  const mounts = Array.isArray(frontend) ? frontend : [{ path: '/', app: frontend, ...(publicFolder ? { publicFolder } : {}) }]
  const seen = new Set<string>()
  return mounts.map(mount => {
    const prefix = prefixOf(mount.path)
    if (seen.has(prefix)) {
      throw new Error(`Two frontends at ${mount.path}`)
    }
    seen.add(prefix)
    return { ...mount, prefix }
  })
}
