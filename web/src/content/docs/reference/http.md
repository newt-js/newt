---
title: HTTP API
description: Everything @newt-js/core/http exports, with its options and defaults.
sidebar:
  order: 2
---

`@newt-js/core/http` is the part of newt that turns HTTP requests into calls to your use cases and runs your contexts on a Bun server. For the ideas behind it, read [HTTP and routes](/concepts/http/).

```ts
import { HttpRouter, bodyOf, pageRequestFrom, runContexts } from '@newt-js/core/http'
```

## HttpRouter

The routes of one context. Each context gets its own router.

```ts title="src/contexts/tasks/tasks.context.ts"
const router = new HttpRouter({ database })
router.authenticateWith(authenticate)
```

### Constructor options

`new HttpRouter(options?: HttpRouterOptions)`. `HttpRouterOptions` is every [route option](#route-options) (used as the default of each route) plus:

| Option | Type | Default | Meaning |
|---|---|---|---|
| `prefix` | `string` | `'/api'` | Put before every path. `''` for none. |
| `database` | `Pick<Database, 'records'>` | none | Keeps the answers of idempotent routes (table `newt_idempotency_key`). Required if any route is idempotent. |
| `clock` | `Clock` | system clock | The time idempotency keys expire by. |

### Methods

| Member | Signature | What it does |
|---|---|---|
| `prefix` | `readonly string` | The prefix given, or `'/api'`. |
| `authenticateWith` | `(authenticator: Authenticator) => void` | Sets who signs requests in. Without it, every private route answers 401. |
| `get` `post` `put` `patch` `delete` | `(path, route: HttpRoute<Path>, options?: RouteOptions) => void` | Registers a route. Throws if the same method and path are registered twice. |
| `group` | `(prefix, middleware: Middleware<Prefix>, options?: RouteOptions) => HttpGroup<Prefix>` | Routes under a common path that share a middleware and options. |
| `answer` | `(request: Request) => Promise<Response> \| null` | Answers a request. `null` when no route matches and the path is outside the prefix. |
| `match` | `(request: Request) => PathPattern \| null` | The pattern of the route a request would reach. |
| `paths` | `() => string[]` | Every registered path, plus the prefix and `prefix/*`. |
| `largestBody` | `() => number` | The largest `maxBodyBytes` of its routes. |

`answer` is also how module tests call routes without a server:

```ts
const response = await router.answer(new Request(`http://backend.test/api/tasks/tasks/${id}`))
```

### Paths

| Piece | Example | Matches |
|---|---|---|
| Static | `/tasks/tasks` | That exact segment. |
| Parameter | `/tasks/tasks/:id` | One non-empty segment, read as `request.params.id` (URL-decoded). |
| Rest | `/files/*` | One or more segments. Only at the end. |

A path starts with `/` (or is `''`). When several routes match, the static segment wins over a parameter, and a parameter over `*`.

What the router answers on its own:

| Case | Answer |
|---|---|
| Path under the prefix with no route | 404, code `route_not_found` |
| Path known, method not registered | 405, code `method_not_allowed`, with an `Allow` header |
| `HEAD` on a path with `GET` | The `GET` answer without a body |
| `OPTIONS` on a route with `cors` | 204 with the CORS preflight headers |

### HttpGroup

`router.group(prefix, middleware, options?)` returns an `HttpGroup` with `get`, `post`, `put`, `patch` and `delete`, same signatures as the router. Each path is the group's prefix plus its own. The middleware runs after sign-in and before the route:

```ts
const reports = router.group('/tasks/reports', async (request, next) => {
  const response = await next()
  return response
}, { maxBodyBytes: 64 * 1024 })
reports.get('/overdue', async () => Response.json({ items: [] }))
```

`Middleware<Prefix> = (request: HttpRequest<Prefix>, next: () => Promise<Response>) => Response | Promise<Response>`.

## Route options

`RouteOptions` go on a route, a group or the router. A route's own options win over its group's, and a group's over the router's. Rate limits add up instead: see [`rateLimit`](#rate-limits).

| Option | Type | Default | Meaning |
|---|---|---|---|
| `public` | `boolean` | `false` | Anyone may call it: no sign-in is asked. |
| `maxBodyBytes` | `number` | `1048576` (1 MiB) | Largest body accepted. Longer → 413. |
| `rateLimit` | `HttpRateLimit \| HttpRateLimit[] \| false` | none | Limits how often it is called. `false` removes the router's and group's. |
| `idempotency` | `true \| { ttlMs?: number } \| false` | `false` | A `POST` sent twice with the same `Idempotency-Key` runs once. |
| `cors` | `Cors` | none | Lets pages of other origins call it. |
| `crossOrigin` | `boolean` | `false` | Turns off the same-origin check for this route. |
| `onError` | `ErrorHandler` | `toErrorResponse` | Turns a thrown error into a response. |

```ts
router.put(`${path}/*`, request => storage.handler(request), { public: true, maxBodyBytes: 100 * 1024 * 1024 })
```

### What every route does

Each registered route is wrapped, from the outside in:

1. Sets `cache-control: no-store` if the response has no `cache-control`.
2. Adds the cookies set on `request.cookies` to the response.
3. Adds CORS headers (when `cors` is set).
4. Checks the body size, reads JSON, and turns errors into responses.
5. Same-origin check, for every method but `GET` (unless `crossOrigin`).
6. Sign-in, unless `public`.
7. Rate limits.
8. Idempotency, only for `POST`.

### Same-origin check

A request that changes something (`POST`, `PUT`, `PATCH`, `DELETE`) is refused with 403 `cross_origin_refused` when it comes from a page of another origin, unless the route's `cors` allows that origin and the request carries no cookies. A request counts as same-origin when `Sec-Fetch-Site` is `same-origin` or `none`, when it has no `Origin` header, or when the `Origin` host equals the request's host.

### Cors

```ts
type Cors = { origin: '*' | string[], headers?: string[], expose?: string[], maxAge?: number }
```

| Field | Default | Meaning |
|---|---|---|
| `origin` | — | `'*'` or the origins allowed. With a list, responses carry `Vary: origin`. |
| `headers` | none | Request headers allowed (`Access-Control-Allow-Headers`). |
| `expose` | none | Response headers the page may read (`Access-Control-Expose-Headers`). |
| `maxAge` | `86400` | Seconds a browser keeps the preflight answer. |

### Rate limits

```ts
type HttpRateLimit = {
  limit: RateLimit
  by?: 'actor' | 'ip' | ((request: HttpRequest) => string | null)
}
```

| `by` | Counts per |
|---|---|
| `'actor'` (default) | Signed-in user; the client IP when no one is signed in. |
| `'ip'` | Client IP (see `trustProxy` in [serve options](#serve-options)). |
| function | The key it returns; `null` skips this limit. |

You make a `RateLimit` with `base.rateLimits.define('<module>.<name>', { limit, windowMs })` (see [@newt-js/core](/reference/core/)). Limits of the router, the group and the route all apply; one with the same name counts once. Answers carry `ratelimit-limit` and `ratelimit-remaining` of the closest limit. Over the limit → 429 `too_many_requests` with a `retry-after` header in seconds.

```ts
const create = base.rateLimits.define('task.create', { limit: 10, windowMs: 60_000 })
router.post('/tasks/tasks', route, { rateLimit: { limit: create } })
```

### Idempotency

With `idempotency` on a `POST` route, a client can send an `Idempotency-Key` header. The first answer is kept and sent again to every retry with the same key.

| Rule | Value |
|---|---|
| Applies to | `POST` routes, with an `Idempotency-Key` header, from a signed-in user. Otherwise the route runs as usual. |
| Key is per | User + path + key. |
| Answer kept for | `ttlMs`, default 24 hours. |
| Replayed answer | Same status, body and main headers, plus `idempotent-replayed: true`. |
| Answers not kept | 5xx (the key is freed to retry). |
| Answers kept without body | Over 1 MiB, or `text/event-stream`: a retry gets 409 `idempotency_answer_not_kept`. |
| Same key, another body | 422 `idempotency_key_reused`. |
| Same key, first still running | 409 `idempotency_key_in_use`. |

:::caution
Registering an idempotent route throws when the router has no `database`, or when the route is `public`. Pass `database` to `new HttpRouter` before turning `idempotency` on.
:::

## Requests

### HttpRequest

```ts
type HttpRequest<Path extends string = string> = Request & {
  readonly params: ParamsOf<Path>
  readonly cookies: Bun.CookieMap
}
```

`params` is typed from the path: `'/tasks/:id'` gives `{ id: string }`. `HttpRoute<Path> = (request: HttpRequest<Path>) => Response | Promise<Response>`. `HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'`.

Inside a route, `request.json()` throws 415 `unsupported_media_type` when the `content-type` is not JSON (`application/json` or `application/*+json`), and 400 `malformed_body` when the JSON does not parse. `request.formData()` throws 400 `malformed_body` when it cannot be read.

### Input helpers

| Function | Signature | Returns |
|---|---|---|
| `bodyOf` | `(request: Request) => Promise<Unchecked>` | The JSON body, not checked yet: your use case's schema checks it. |
| `queryOf` | `(request: Request) => Unchecked` | The query string as a plain object. |
| `pageRequestFrom` | `(request: Request) => PageRequest` | `{ size, cursor }` from `?size=&cursor=`. `size` defaults to 20 and stays between 1 and 100. |
| `clientIp` | `(request: Request) => string \| null` | The client's IP, as the server saw it (see `trustProxy`). |
| `requestHost` | `(request: Request) => string \| null` | The host asked for, lower-case (`X-Forwarded-Host` when trusted). |

`Unchecked` is `any`.

```ts title="src/contexts/tasks/modules/task/task.routes.ts"
router.post('/tasks/tasks', async request => Response.json(await tasks.create(await bodyOf(request)), { status: 201 }))
router.get('/tasks/tasks', async request => Response.json(await tasks.paginate({}, pageRequestFrom(request))))
```

## Sign-in

| Export | Signature | What it does |
|---|---|---|
| `Authenticator` | `(request: HttpRequest) => Promise<Actor \| null>` | Says who calls. `null` means no one: private routes answer 401 `not_signed_in`. |
| `bearerAuthenticator` | `(verify: (token: string) => Promise<Actor \| null>) => Authenticator` | Reads `Authorization: Bearer <token>` and passes the token to `verify`. |
| `setSessionCookie` | `(request, name, value, { secure, maxAgeSeconds, path? }) => void` | Sets an `HttpOnly`, `SameSite=Lax` cookie. `path` defaults to `/`. |
| `clearSessionCookie` | `(request, name, { secure, path? }) => void` | Removes that cookie. |
| `SessionCookieOptions` | `{ secure: boolean, maxAgeSeconds: number, path?: string }` | |

```ts title="src/auth.ts"
export const authenticate: Authenticator = async () => null
```

:::note
The `authenticate` that `newt init` writes in `src/auth.ts` returns `null` until you fill it in, so every route that is not `public` answers 401.
:::

See [Authentication](/guides/authentication/).

## Errors and status codes

A thrown error becomes a JSON response by its `kind`:

| `kind` | Status | Thrown by (examples) |
|---|---|---|
| `validation` | 400 | `ValidationError`, `MalformedBody` |
| `unauthorized` | 401 | `UnauthorizedError`, `NotSignedIn` |
| `forbidden` | 403 | `ForbiddenError`, `CrossOriginRefused` |
| `not_found` | 404 | `NotFoundError`, `RouteNotFound` |
| `method_not_allowed` | 405 | `MethodNotAllowed` |
| `conflict` | 409 | `ConflictError`, `IdempotencyKeyInUse`, `IdempotencyAnswerNotKept` |
| `too_large` | 413 | `PayloadTooLarge` |
| `unsupported_media_type` | 415 | `UnsupportedMediaType` |
| `unprocessable` | 422 | `IdempotencyKeyReused` |
| `too_many_requests` | 429 | `TooManyRequests` (adds `retry-after`) |

A zod error (`ZodError`) answers 400 with code `validation` and its `issues`. Any other error answers 500 `{ "error": "Something went wrong", "code": "internal" }` and is logged.

```ts
type ErrorBody = { error: string, code: string, params?: Record<string, unknown>, issues?: unknown[] }
```

```json
{ "error": "There is no such task", "code": "task.not_found" }
```

### Errors of this package

| Class | Status | `code` | `params` |
|---|---|---|---|
| `MalformedBody` | 400 | `malformed_body` | |
| `NotSignedIn` | 401 | `not_signed_in` | |
| `CrossOriginRefused` | 403 | `cross_origin_refused` | |
| `RouteNotFound` | 404 | `route_not_found` | `method`, `path` |
| `MethodNotAllowed` | 405 | `method_not_allowed` | `method`, `path` |
| `IdempotencyKeyInUse` | 409 | `idempotency_key_in_use` | |
| `IdempotencyAnswerNotKept` | 409 | `idempotency_answer_not_kept` | `status` |
| `PayloadTooLarge` | 413 | `payload_too_large` | `maxBytes` |
| `UnsupportedMediaType` | 415 | `unsupported_media_type` | |
| `IdempotencyKeyReused` | 422 | `idempotency_key_reused` | |

### Error functions

| Export | Signature | What it does |
|---|---|---|
| `toErrorResponse` | `(error: unknown) => Response` | The default `onError`, with the mapping of [Errors and status codes](#errors-and-status-codes). |
| `toOauthErrorResponse` | `(error, fallback: string, codes?: Record<string, string>) => Response` | Same mapping, but with an OAuth body `{ error, error_description }` and `cache-control: no-store`. `codes` maps your error codes to OAuth ones; `fallback` is used otherwise. |
| `statusOf` | `(kind: string) => number \| null` | The status of a `kind`, or `null`. |
| `ErrorHandler` | `(error: unknown, request: Request) => Response \| Promise<Response>` | The type of `onError`. |
| `handle` | `(route, onError?, maxBodyBytes?) => HttpRoute` | Wraps a route with the body checks and the error handler. The router does it for you. |

## Running contexts

### runContexts

`runContexts(contexts: ContextToRun[], options?: RunContextsOptions): RunningContexts` starts your contexts: their servers, workers and scheduled tasks.

```ts title="src/backend.ts"
return runContexts(contexts, { platformWithoutContexts: platform, serve: { port, health: true, frontend: frontends } })
```

`ContextToRun` is what each context's `open` returns:

| Field | Type | Meaning |
|---|---|---|
| `context` | `BoundedContext` | The context. |
| `router` | `HttpRouter` | Its routes, served by the shared server (`options.serve`). |
| `serve` | `ServeOptions` | Gives this context a server of its own. |

`RunContextsOptions`:

| Option | Type | Default | Meaning |
|---|---|---|---|
| `serve` | `Omit<ServeOptions, 'routers'>` | none | One server for every context's router. Two contexts with the same path throw. |
| `signals` | `boolean` | `true` | On `SIGINT` or `SIGTERM`, stop and end the process (exit code 1 if a step failed). |
| `stopTimeoutMs` | `number` | `8000` | How long servers and workers get to finish before being forced. |
| `platformWithoutContexts` | `Platform` | none | The platform to use when there are no contexts yet. When there are, it must be theirs. |

`RunningContexts`:

| Member | Type | Meaning |
|---|---|---|
| `server` | `Bun.Server` | The shared server, when `serve` was given. |
| `servers` | `Record<string, Bun.Server>` | Each context's own server, by context name. |
| `stop` | `() => Promise<void>` | Stops servers, then workers, then closes the contexts (last one first). Throws an `AggregateError` if a step failed; the others still run. |

### Serve options

`ServeOptions`, used by `runContexts` and by `serve(options): Bun.Server`:

| Option | Type | Default | Meaning |
|---|---|---|---|
| `port` | `number` | — (required) | Port to listen on. `0` picks a free one. |
| `routers` | `HttpRouter[]` | `[]` | Routers to serve. `runContexts` fills it. |
| `routes` | `Bun.Serve.Routes` | none | Extra Bun routes. |
| `frontend` | `string \| Bun.HTMLBundle \| FrontendMount[]` | none | A built folder, an HTML import, or several frontends by path. |
| `publicFolder` | `string` | none | Files served as they are next to an HTML-import frontend. |
| `proxy` | `Record<string, string>` | none | Path → URL to forward to (for example a dev server). |
| `development` | `boolean` | `false` | Bun's development mode (HMR for HTML imports, detailed errors). |
| `health` | `boolean \| string` | none | `true` adds `GET /api/health`; a string sets another path. Answers `{"status":"ok"}`, or 503 `{"status":"stopping"}` while stopping. |
| `drainMs` | `number` | `0` | On stop, keep answering this long first (health already says `stopping`). |
| `trustProxy` | `number` | `0` | How many proxies in front to trust for `X-Forwarded-For` and `X-Forwarded-Host`. |
| `securityHeaders` | `Record<string, string \| null> \| false` | `SECURITY_HEADERS` | Headers added to every response that lacks them. `null` drops one; `false` drops all. |
| `hsts` | `boolean \| { maxAgeSeconds?, includeSubDomains?, preload? }` | off | Adds `Strict-Transport-Security`. `true` = one year. |
| `csp` | `Record<string, string[] \| null> \| false` | `CONTENT_SECURITY_POLICY` | Content-Security-Policy of built-folder frontends. |
| `maxBodyBytes` | `number` | `1048576` | Largest body the server takes; raised to the largest route's. |
| `idleTimeoutSeconds` | `number` | Bun's | Closes idle connections after this. |

:::tip
Behind a proxy or load balancer, set `trustProxy` to the number of proxies in front. With `0`, `clientIp` is the proxy's address, and every client shares the same rate limits by IP.
:::

Default security headers (`SECURITY_HEADERS`):

| Header | Value |
|---|---|
| `x-content-type-options` | `nosniff` |
| `referrer-policy` | `strict-origin-when-cross-origin` |
| `x-frame-options` | `DENY` |

### Frontends

```ts
type FrontendMount = { path: string, app: string | Bun.HTMLBundle, publicFolder?: string }
```

```ts title="src/frontends.ts"
export const frontends: FrontendMount[] = [
  { path: '/tasks', app: tasksFrontend },
]
```

| `app` | Served as |
|---|---|
| `Bun.HTMLBundle` (an `import x from './index.html'`) | Bun bundles it. Every path under `path` gets the page; `publicFolder` files are served at their own paths. |
| `string` (a built folder) | Files of the folder. A path with no file gets `index.html`. Dotfiles are never served. No `index.html` → 503. |

Paths start with `/`; two frontends at the same path throw. Routes of the routers win over frontends. See [Adding a frontend](/guides/frontend/).

HTML pages of a built folder get `x-frame-options: DENY` and a Content-Security-Policy. Its default (`CONTENT_SECURITY_POLICY`), to which `csp` adds or replaces directives (`null` removes one); hashes of inline scripts are added to `script-src`:

| Directive | Sources |
|---|---|
| `default-src` | `'self'` |
| `script-src` | `'self'` |
| `style-src` | `'self' 'unsafe-inline'` |
| `img-src` | `'self' data: blob:` |
| `font-src` | `'self' data:` |
| `connect-src` | `'self'` |
| `object-src` | `'none'` |
| `base-uri` | `'self'` |
| `frame-ancestors` | `'none'` |

`csp: false` sends only `frame-ancestors 'none'`.

## Other exports

| Export | Signature | What it does |
|---|---|---|
| `serve` | `(options: ServeOptions) => Bun.Server` | One server, without contexts. |
| `serveFrontend` | `(folder: string, csp?, base?) => (request: Request) => Promise<Response>` | Serves one built folder, as in [Frontends](#frontends). |
| `proxyTo` | `(target: string) => (request, server) => Promise<Response>` | Forwards a request to `target`, adding `X-Forwarded-Host`, `-Proto` and `-For`. |
| `withHeadersSet` | `(response, headers: Record<string, string \| null>) => Response` | A copy of the response with those headers set (`null` deletes). |
| `MAX_BODY_BYTES` | `1048576` | The default body limit. |
| `SECURITY_HEADERS`, `CONTENT_SECURITY_POLICY` | constants | The defaults of [Serve options](#serve-options) and [Frontends](#frontends). |
| `KeptAnswer` | type | A row of `newt_idempotency_key`. |

The package also exports the types of each section: `Cors`, `Idempotency`, `HttpRateLimit`, `HttpRouterOptions`, `RouteOptions`, `ParamsOf`, `Middleware`, `ErrorBody`, `Hsts`, `SecurityHeaders`, `ContentSecurityPolicy`, `FrontendMount`, `ServeOptions`, `RunContextsOptions`, `ContextToRun`, `RunningContexts`, `Unchecked`.
