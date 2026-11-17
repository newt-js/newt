import { serveFrontend }     from '../../frontend/serve-frontend/serve-frontend'
import type { Handler }      from '../handler'
import type { Mount }        from '../mount'
import type { ServeOptions } from '../serve-options'

export function builtFrontends(mounts: Mount[], csp: ServeOptions['csp']): Handler {
  const built = mounts
    .filter(mount => typeof mount.app === 'string')
    .map(mount => ({ prefix: mount.prefix, serve: serveFrontend(mount.app as string, csp, mount.prefix) }))
    .sort((a, b) => b.prefix.length - a.prefix.length)
  return request => {
    const path = new URL(request.url).pathname
    const mount = built.find(({ prefix }) => path === prefix || path.startsWith(`${prefix}/`))
    return mount ? mount.serve(request) : new Response('Not found', { status: 404 })
  }
}
