import { requiredEnv }            from '../../../../application/data/env/env'
import type { Database }          from '../../../../application/database/database'
import type { Clock }             from '../../../../domain/clock/clock'
import { systemClock }            from '../../../../domain/clock/system-clock/system-clock'
import { handle }                 from '../../body/handle/handle'
import { corsHeaders }            from '../../cors/cors-headers/cors-headers'
import { withCors }               from '../../cors/with-cors/with-cors'
import { MethodNotAllowed }       from '../../errors/method-not-allowed/method-not-allowed'
import { RouteNotFound }          from '../../errors/route-not-found/route-not-found'
import type { Idempotency }       from '../../idempotency/idempotency'
import type { IdempotentOptions } from '../../idempotency/idempotent/idempotent'
import type { KeptAnswer }        from '../../idempotency/kept-answer'
import type { Guarding }          from '../../layers/guarded/guarded'
import { layered }                from '../../layers/layered/layered'
import type { LayeredOptions }    from '../../layers/layering'
import { noStore }                from '../../layers/no-store/no-store'
import { ROUTE_LAYERS }           from '../../layers/route-layers/route-layers'
import { addLimits }              from '../../rate-limits/add-limits/add-limits'
import { withParams }             from '../../request/with-params/with-params'
import { withHeadersSet }         from '../../responses/with-headers-set/with-headers-set'
import type { Authenticator }     from '../../session/authenticator'
import type { GroupOptions }      from '../group-options'
import { headOf }                 from '../head-of/head-of'
import { HttpGroup }              from '../http-group/http-group'
import type { HttpMethod }        from '../http-route'
import type { HttpRoute }         from '../http-route'
import type { HttpRouterOptions } from '../http-router-options'
import { MAX_BODY_BYTES }         from '../max-body-bytes/max-body-bytes'
import { paramsOf }               from '../params-of/params-of'
import { PathPattern }            from '../path-pattern/path-pattern'
import { partsOf }                from '../path-pattern/path-pattern'
import type { RouteGuard }        from '../route-guard'
import type { RouteOptions }      from '../route-options'

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']

type Registered = { route: HttpRoute, options: RouteOptions, pattern: PathPattern }

type Entry = { pattern: PathPattern, byMethod: Map<HttpMethod, Registered> }

export class HttpRouter {

  private readonly table = new Map<string, Entry>()
  readonly prefix: string
  readonly host: string | undefined
  private readonly defaults: RouteOptions
  private authenticator: Authenticator | null = null
  private readonly guards: Guarding[] = []
  private database: Pick<Database, 'records'> | undefined
  private readonly clock: Clock

  constructor({ prefix, host, database, clock, ...defaults }: HttpRouterOptions = {}) {
    this.prefix = prefix ?? '/api'
    this.host = host
    this.defaults = defaults
    this.database = database
    this.clock = clock ?? systemClock
  }

  /**
   * Where its routes answer from outside, under its prefix: at its own host if it has one, with PUBLIC_URL's scheme,
   * or else at PUBLIC_URL. Read on each call, so `.env` can change under the tests.
   */
  publicUrl(): string {
    const backend = requiredEnv('PUBLIC_URL')
    const origin = this.host ? `${new URL(backend).protocol}//${this.host}` : backend
    return `${origin}${this.prefix}`
  }

  authenticateWith(authenticator: Authenticator): void {
    this.authenticator = authenticator
  }

  /**
   * Who may go on at a path and under it, whatever module its routes are of: `guard` throws to refuse. It runs once the
   * caller is signed in, on public routes too. Given in the context's `initialize`, once its modules have registered
   * their routes, since who may is often known by a module that the path's own cannot use.
   */
  guard<Path extends string>(path: Path, guard: RouteGuard<Path>): void {
    const pattern = new PathPattern(`${this.prefix}${path}`)
    if (pattern.segments.some(segment => segment.kind === 'rest')) {
      throw new Error(`A guard covers all that is under its path, so it has no '*': ${path}`)
    }
    if (![...this.table.values()].some(({ pattern: route }) => pattern.covers(route))) {
      throw new Error(`No route is at ${path} or under it, so its guard would let everyone in: check the path, and give it after the routes are registered`)
    }
    this.guards.push({ pattern, guard: guard as RouteGuard })
  }

  /** The database that keeps the first answers of its idempotent routes, when it opens after the router. */
  keepAnswersIn(database: Pick<Database, 'records'>): void {
    this.database = database
  }

  get<Path extends string>(path: Path, route: HttpRoute<Path>, options?: RouteOptions): void {
    this.add('GET', path, route, options)
  }

  post<Path extends string>(path: Path, route: HttpRoute<Path>, options?: RouteOptions): void {
    this.add('POST', path, route, options)
  }

  put<Path extends string>(path: Path, route: HttpRoute<Path>, options?: RouteOptions): void {
    this.add('PUT', path, route, options)
  }

  patch<Path extends string>(path: Path, route: HttpRoute<Path>, options?: RouteOptions): void {
    this.add('PATCH', path, route, options)
  }

  delete<Path extends string>(path: Path, route: HttpRoute<Path>, options?: RouteOptions): void {
    this.add('DELETE', path, route, options)
  }

  group<Prefix extends string>(prefix: Prefix, { middleware, ...options }: GroupOptions<Prefix> = {}): HttpGroup<Prefix> {
    const register = (method: HttpMethod, path: string, route: HttpRoute<any>, own: LayeredOptions) => this.register(method, path, route, own)
    return new HttpGroup(register, prefix, middleware, { ...options, rateLimit: addLimits(this.defaults.rateLimit, options.rateLimit) })
  }

  answer(request: Request): Promise<Response> | null {
    const pathname = new URL(request.url).pathname
    const parts = partsOf(pathname)
    const found = parts ? this.find(parts) : null
    if (found) {
      return this.answerAt(found.entry, found.values, request)
    }
    if (this.prefix !== '' && (pathname === this.prefix || pathname.startsWith(`${this.prefix}/`))) {
      return this.notFound(request)
    }
    return null
  }

  match(request: Request): PathPattern | null {
    const parts = partsOf(new URL(request.url).pathname)
    return (parts ? this.find(parts) : null)?.entry.pattern ?? null
  }

  paths(): string[] {
    const own = [...this.table.values()].map(({ pattern }) => pattern.path).filter(path => path !== '')
    return this.prefix === '' ? own : [this.prefix, `${this.prefix}/*`, ...own]
  }

  largestBody(): number {
    const all = [...this.table.values()].flatMap(({ byMethod }) => [...byMethod.values()].map(({ options }) => options.maxBodyBytes ?? MAX_BODY_BYTES))
    return Math.max(0, ...all)
  }

  private add(method: HttpMethod, path: string, route: HttpRoute<any>, own?: RouteOptions): void {
    this.register(method, path, route, { ...own, rateLimit: addLimits(this.defaults.rateLimit, own?.rateLimit) })
  }

  private register(method: HttpMethod, path: string, route: HttpRoute<any>, own: LayeredOptions): void {
    const pattern = new PathPattern(`${this.prefix}${path}`)
    const entry = this.table.get(pattern.shape) ?? { pattern, byMethod: new Map<HttpMethod, Registered>() }
    if (entry.byMethod.has(method)) {
      throw new Error(`Route ${method} ${pattern.path} is registered twice`)
    }
    const options = { ...this.defaults, ...own }
    const layering = {
      method,
      path: pattern.path,
      options,
      authenticator: () => this.authenticator,
      guards: () => this.guards.filter(each => each.pattern.covers(pattern)),
      keeping: (idempotency: Idempotency) => this.keeping(method, pattern.path, idempotency, options.public),
    }
    entry.byMethod.set(method, { route: layered(route as HttpRoute, ROUTE_LAYERS, layering), options, pattern })
    this.table.set(pattern.shape, entry)
  }

  private keeping(method: HttpMethod, path: string, idempotency: Idempotency, isPublic: boolean | undefined): IdempotentOptions {
    if (isPublic) {
      throw new Error(`${method} ${path} is public and idempotent: a key is kept per person signed in, and a public route's callers are no one, so they would share each other's answers. Leave idempotency out (\`idempotency: false\` under a group's or a router's)`)
    }
    if (!this.database) {
      throw new Error(`${method} ${path} is idempotent: its router needs a database (HttpRouterOptions.database, or keepAnswersIn), which keeps the first answers`)
    }
    return { keys: this.database.records<KeptAnswer>('newt_idempotency_key'), clock: this.clock, ...(idempotency === true ? {} : idempotency) }
  }

  private find(parts: string[]): { entry: Entry, values: string[] } | null {
    let best: { entry: Entry, values: string[] } | null = null
    for (const entry of this.table.values()) {
      const values = entry.pattern.match(parts)
      if (values && (!best || entry.pattern.outranks(best.entry.pattern))) {
        best = { entry, values }
      }
    }
    return best
  }

  private async answerAt(entry: Entry, values: string[], request: Request): Promise<Response> {
    const registered = entry.byMethod.get(request.method as HttpMethod)
    if (registered) {
      return registered.route(withParams(request, paramsOf(registered.pattern, values)))
    }
    const get = request.method === 'HEAD' ? entry.byMethod.get('GET') : undefined
    if (get) {
      return headOf(await get.route(withParams(request, paramsOf(get.pattern, values))))
    }
    const all = [...entry.byMethod.values()]
    const methods = METHODS.filter(method => entry.byMethod.has(method)).flatMap(method => (method === 'GET' ? ['GET', 'HEAD'] : [method]))
    const cors = all.find(each => each.options.cors)?.options.cors
    const at = withParams(request, paramsOf(all[0]!.pattern, values))
    if (request.method === 'OPTIONS' && cors) {
      return new Response(null, { status: 204, headers: corsHeaders(cors, at, [...methods, 'OPTIONS']) })
    }
    const notAllowed = noStore(withCors(handle(() => {
      throw new MethodNotAllowed(request.method, entry.pattern.path)
    }, all[0]!.options.onError), cors))
    return withHeadersSet(await notAllowed(at), { allow: methods.join(', ') })
  }

  private notFound(request: Request): Promise<Response> {
    const answer = noStore(handle(() => {
      throw new RouteNotFound(request.method, new URL(request.url).pathname)
    }, this.defaults.onError))
    return Promise.resolve(answer(withParams(request, {})))
  }
}
