import type { ContextBase }               from '@newt-js/core/application'
import type { HttpRouter }                from '@newt-js/core/http'
import { clearSessionCookie }             from '@newt-js/core/http'
import { requestHost }                    from '@newt-js/core/http'
import { toOauthErrorResponse }           from '@newt-js/core/http'
// --------------------------------------------------------
import type { SignInSession_Module }      from '../sign-in-session/sign-in-session.module'
import { MalformedOauthRequest }          from './errors/malformed-oauth-request'
import type { OauthAuthorization_Module } from './oauth-authorization.module'

/** Secure unless `.env` says otherwise, as the cookies of sessions are set. */
const SECURE = Bun.env.AUTH_COOKIE_SECURE !== 'false'

/** The host a request came to, which says the application. */
export function hostOf(request: Request): string {
  return requestHost(request) ?? new URL(request.url).host
}

/** The OAuth error of each of this module's errors; any other, `invalid_request`. */
const OAUTH_ERRORS = {
  'oauthAuthorization.invalid_client': 'invalid_client',
  'oauthAuthorization.invalid_grant': 'invalid_grant',
  'oauthAuthorization.unsupported_grant_type': 'unsupported_grant_type',
  'oauthAuthorization.malformed_oauth_request': 'invalid_request',
}

/** A client's id and secret: in a Basic header (client_secret_basic), or else in the form (client_secret_post). */
function clientCredentialsOf(request: Request, form: Record<string, string>): { clientId: string, clientSecret: string } {
  const [scheme, encoded = ''] = (request.headers.get('authorization') ?? '').split(' ')
  if (scheme?.toLowerCase() !== 'basic') {
    return { clientId: form.client_id ?? '', clientSecret: form.client_secret ?? '' }
  }
  // One way to prove itself per request (RFC 6749 §2.3).
  if (form.client_secret !== undefined) {
    throw new MalformedOauthRequest()
  }
  const decoded = Buffer.from(encoded, 'base64').toString()
  const colon = decoded.indexOf(':')
  // Each half is form-urlencoded first (RFC 6749 §2.3.1).
  const unescape = (text: string) => decodeURIComponent(text.replaceAll('+', ' '))
  try {
    return { clientId: unescape(decoded.slice(0, colon)), clientSecret: unescape(decoded.slice(colon + 1)) }
  } catch {
    return { clientId: '', clientSecret: '' }
  }
}

/** Parameters by name; one that comes twice is refused, as OAuth says (RFC 6749 §3.1). */
function singleParams(entries: Iterable<[string, unknown]>): Record<string, string> {
  const params: Record<string, string> = {}
  for (const [name, value] of entries) {
    if (name in params) {
      throw new MalformedOauthRequest()
    }
    if (typeof value === 'string') {
      params[name] = value
    }
  }
  return params
}

function queryOf(request: Request): Record<string, string> {
  return singleParams(new URL(request.url).searchParams.entries())
}

/** The form of a request, its text fields only. */
async function formOf(request: Request): Promise<Record<string, string>> {
  return singleParams((await request.formData()).entries())
}

/** An OAuth error; a client that failed to prove itself is told how to (RFC 6749 §5.2). */
function oauthErrorOf(error: unknown): Response {
  const response = toOauthErrorResponse(error, 'invalid_request', OAUTH_ERRORS)
  if (response.status === 401) {
    response.headers.set('www-authenticate', 'Basic realm="auth"')
  }
  return response
}

/** An error of a bearer token, as RFC 6750 §3 tells it. */
function bearerErrorOf(error: unknown): Response {
  const response = toOauthErrorResponse(error, 'invalid_request', { 'oauthAuthorization.invalid_token': 'invalid_token' })
  if (response.status === 401) {
    response.headers.set('www-authenticate', 'Bearer error="invalid_token"')
  }
  return response
}

/** OpenID's endpoints: public, since they are how one signs in. */
export function registerOauthAuthorizationRoutes(
  router: HttpRouter,
  oauthAuthorizations: OauthAuthorization_Module,
  { rateLimits, signInSessions }: { rateLimits: ContextBase['rateLimits'], signInSessions: SignInSession_Module },
) {
  const tokens = rateLimits.define('oauthAuthorization.tokens', { limit: 60, windowMs: 60_000 })
  // Its path is fixed by OpenID Connect Discovery: the issuer and this.
  router.get('/.well-known/openid-configuration', async request => {
    return Response.json(await oauthAuthorizations.discovery(hostOf(request)))
  }, { public: true })
  router.get('/oauth-authorizations/authorize', async request => {
    const query = queryOf(request)
    const cookies = Object.fromEntries(request.cookies.entries())
    const { redirectTo } = await oauthAuthorizations.authorize({ host: hostOf(request), cookies, query })
    return new Response(null, { status: 302, headers: { 'location': redirectTo, 'cache-control': 'no-store' } })
  }, { public: true, onError: error => toOauthErrorResponse(error, 'invalid_request') })
  // Called by the client's backend, not a browser: no origin to check, and a form, as OAuth says.
  router.post('/oauth-authorizations/token', async request => {
    const form = await formOf(request)
    const exchanged = await oauthAuthorizations.exchange({ host: hostOf(request), ...clientCredentialsOf(request, form), form })
    return Response.json(exchanged, { headers: { 'cache-control': 'no-store', 'pragma': 'no-cache' } })
  }, { public: true, crossOrigin: true, rateLimit: { limit: tokens, by: 'ip' }, onError: oauthErrorOf })
  // OpenID's UserInfo, by GET or POST, with the access token as a bearer (RFC 6750).
  const userInfo = async (request: Request) => {
    const [scheme, accessToken = ''] = (request.headers.get('authorization') ?? '').split(' ')
    const told = await oauthAuthorizations.userInfo({ host: hostOf(request), accessToken: scheme?.toLowerCase() === 'bearer' ? accessToken : '' })
    return Response.json(told, { headers: { 'cache-control': 'no-store' } })
  }
  const userInfoOptions = { public: true, crossOrigin: true, onError: bearerErrorOf }
  router.get('/oauth-authorizations/userinfo', userInfo, userInfoOptions)
  router.post('/oauth-authorizations/userinfo', userInfo, userInfoOptions)
  // OpenID's RP-Initiated Logout: this module checks where to go back, and the session is ended by its own module.
  router.get('/oauth-authorizations/end-session', async request => {
    const query = queryOf(request)
    const { applicationSlug, userId, redirectTo } = await oauthAuthorizations.endSession({ host: hostOf(request), query })
    const cookies = Object.fromEntries(request.cookies.entries())
    const { endedCookie } = await signInSessions.endCurrent({ cookies, applicationSlug, userId })
    if (endedCookie !== null) {
      clearSessionCookie(request, endedCookie, { secure: SECURE })
    }
    if (redirectTo === null) {
      return Response.json({ signedOut: true }, { headers: { 'cache-control': 'no-store' } })
    }
    return new Response(null, { status: 302, headers: { 'location': redirectTo, 'cache-control': 'no-store' } })
  }, { public: true, onError: error => toOauthErrorResponse(error, 'invalid_request') })
  return { one: router.group('/oauth-authorizations/:oauthAuthorizationId') }
}
