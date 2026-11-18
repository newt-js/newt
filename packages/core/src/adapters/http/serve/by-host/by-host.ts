import { clientIps }    from '../../request/client-ip/client-ips'
import { requestHost }  from '../../request/request-host/request-host'
import { requestHosts } from '../../request/request-host/request-hosts'
import { HttpRouter }   from '../../router/http-router/http-router'
import { answerOf }     from '../answer-of/answer-of'
import type { Handler } from '../handler'
import type { Mount }   from '../mount'
import { proxyTo }      from '../proxy-to/proxy-to'

export type ContextAnswers = {
  health: { paths: string[], answer: () => Response }
  routers: HttpRouter[]
  mounts: Mount[]
  frontend: Handler
  /** Where serve hides the HTML-import app of a context with a host, so it answers only through here. */
  hiddenApps: string
}

/** The first segment of the path the router matches, decoded, so `/%61dmin` is `admin`. */
function firstSegmentOf(pathname: string): string {
  const first = pathname.split('/')[1] ?? ''
  try {
    return decodeURIComponent(first)
  } catch {
    return first
  }
}

const notFound = () => Response.json({ error: { code: 'not_found', message: 'Not found' } }, { status: 404 })

/**
 * A handler that answers a context's host as that context's paths, and refuses a context with a host by its path.
 * At its host, a path that already starts with the context's name keeps it, so a URL built for /<context> works there too.
 */
export function byHost(hosts: Record<string, string>, answers: ContextAnswers): (handler: Handler) => Handler {
  const owners = new Map(Object.entries(hosts).map(([host, context]) => [host.toLowerCase(), context]))
  const withHost = new Set(owners.values())
  const rewritten = new WeakSet<Request>()
  const ownerOf = (request: Request) => {
    const host = requestHost(request)
    return host === null ? undefined : owners.get(host) ?? owners.get(host.replace(/:\d+$/, ''))
  }
  const answerAs = async (context: string, request: Request, server: Bun.Server<undefined>) => {
    const url = new URL(request.url)
    const named = firstSegmentOf(url.pathname) === context
    url.pathname = named ? url.pathname : `/${context}${url.pathname === '/' ? '' : url.pathname}`
    const inner = new Request(url.href, request)
    rewritten.add(inner)
    for (const noted of [clientIps, requestHosts]) {
      const value = noted.get(request)
      if (value !== undefined) noted.set(inner, value)
    }
    if (answers.health.paths.includes(url.pathname)) return answers.health.answer()
    const answered = answerOf(answers.routers, inner)
    if (answered) return answered
    const app = answers.mounts.find(mount => mount.prefix === `/${context}`)?.app
    if (app === undefined) return notFound()
    // Bun serves an HTML import only by its path: the server asks it of itself.
    if (typeof app === 'string') return answers.frontend(inner, server)
    const hidden = new URL(inner.url)
    hidden.pathname = `${answers.hiddenApps}${hidden.pathname}`
    return proxyTo(server.url.href)(new Request(hidden.href, inner), server)
  }
  return handler => (request, server) => {
    if (rewritten.has(request)) return handler(request, server)
    const owner = ownerOf(request)
    if (owner !== undefined) return answerAs(owner, request, server)
    return withHost.has(firstSegmentOf(new URL(request.url).pathname)) ? notFound() : handler(request, server)
  }
}
