import { toErrorResponse }   from '../../errors/to-error-response/to-error-response'
import { noteClientIp }      from '../../request/note-client-ip/note-client-ip'
import { noteRequestHost }   from '../../request/note-request-host/note-request-host'
import { withHeaders }       from '../../responses/with-headers/with-headers'
import { MAX_BODY_BYTES }    from '../../router/max-body-bytes/max-body-bytes'
import { answerOf }          from '../answer-of/answer-of'
import { builtFrontends }    from '../built-frontends/built-frontends'
import type { Handler }      from '../handler'
import { mountsOf }          from '../mounts-of/mounts-of'
import { proxied }           from '../proxied/proxied'
import { routesOf }          from '../routes-of/routes-of'
import { securityHeadersOf } from '../security-headers-of/security-headers-of'
import type { ServeOptions } from '../serve-options'
import { sourceFrontends }   from '../source-frontends/source-frontends'
import { wrapped }           from '../wrapped/wrapped'

const HEALTH_PATH = '/health-check'

export function serve(options: ServeOptions): Bun.Server<undefined> {
  const development = options.development ?? false
  const routers = options.routers ?? []
  let stopping = false
  const answerHealth = () => Response.json({ status: stopping ? 'stopping' : 'ok' }, { status: stopping ? 503 : 200 })
  const healthPaths = options.health ? [HEALTH_PATH, ...(options.healthContexts ?? []).map(name => `/${name}${HEALTH_PATH}`)] : []
  const health = Object.fromEntries(healthPaths.map(path => [path, { GET: answerHealth }]))
  const headers = securityHeadersOf(options.securityHeaders, options.hsts)
  const trustProxy = options.trustProxy ?? 0
  const around = (handler: Handler): Handler => async (request, server) => {
    noteClientIp(request, server.requestIP(request)?.address ?? null, trustProxy)
    noteRequestHost(request, trustProxy)
    return withHeaders(await handler(request, server), headers)
  }
  const mounts = mountsOf(options.frontend, options.publicFolder)
  const frontend = builtFrontends(mounts, options.csp)
  const answer: Handler = (request, server) => answerOf(routers, request) ?? frontend(request, server)
  const server = Bun.serve({
    port: options.port,
    development,
    maxRequestBodySize: Math.max(options.maxBodyBytes ?? MAX_BODY_BYTES, ...routers.map(router => router.largestBody())),
    ...(options.idleTimeoutSeconds === undefined ? {} : { idleTimeout: options.idleTimeoutSeconds }),
    routes: wrapped({ ...health, ...routesOf(routers, answer), ...options.routes, ...proxied(options.proxy), ...sourceFrontends(mounts) }, around),
    fetch: around(answer),
    ...(development ? {} : { error: (error: Error) => withHeaders(toErrorResponse(error), headers) }),
  })
  const stop = server.stop.bind(server)
  server.stop = async (closeActiveConnections?: boolean) => {
    const first = !stopping
    stopping = true
    if (options.drainMs && first && !closeActiveConnections) {
      await Bun.sleep(options.drainMs)
    }
    return stop(closeActiveConnections)
  }
  return server
}
