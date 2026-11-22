import { log }               from '../../../../application/platform/log/log'
import { serveFrontend }     from '../../frontend/serve-frontend/serve-frontend'
import type { Handler }      from '../handler'
import type { Mount }        from '../mount'
import { isSourceApp }       from '../mount'
import type { ServeOptions } from '../serve-options'

/** What answers while an app that did not build is asked for: the reason is in the log. */
const unbuilt = () => new Response('The app did not build', { status: 500 })

/** Serves each built app at its prefix; one still being built answers once it is. */
export function builtFrontends(mounts: Mount[], csp: ServeOptions['csp']): Handler {
  const built = mounts
    .flatMap(mount => isSourceApp(mount.app) ? [] : [{ prefix: mount.prefix, folder: mount.app }])
    .map(({ prefix, folder }) => ({
      prefix,
      serving: Promise.resolve(folder).then(ready => serveFrontend(ready, csp, prefix), (error: unknown) => {
        log.error(`[serve] the app at ${prefix || '/'} did not build`, { error })
        return unbuilt
      }),
    }))
    .sort((a, b) => b.prefix.length - a.prefix.length)
  return async request => {
    const path = new URL(request.url).pathname
    const mount = built.find(({ prefix }) => path === prefix || path.startsWith(`${prefix}/`))
    return mount ? (await mount.serving)(request) : new Response('Not found', { status: 404 })
  }
}
