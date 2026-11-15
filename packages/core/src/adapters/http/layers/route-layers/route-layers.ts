import { handle }         from '../../body/handle/handle'
import { withCors }       from '../../cors/with-cors/with-cors'
import { idempotent }     from '../../idempotency/idempotent/idempotent'
import { sameOrigin }     from '../../origin/same-origin/same-origin'
import { rateLimited }    from '../../rate-limits/rate-limited/rate-limited'
import { MAX_BODY_BYTES } from '../../router/max-body-bytes/max-body-bytes'
import { Layer }          from '../layer'
import { noStore }        from '../no-store/no-store'
import { signedIn }       from '../signed-in/signed-in'
import { withCookies }    from '../with-cookies/with-cookies'

export const ROUTE_LAYERS: readonly Layer[] = [
  { name: 'noStore', around: route => noStore(route) },
  { name: 'cookies', around: route => withCookies(route) },
  { name: 'cors', around: (route, { options }) => withCors(route, options.cors) },
  { name: 'handled', around: (route, { options }) => handle(route, options.onError, options.maxBodyBytes ?? MAX_BODY_BYTES) },
  { name: 'sameOrigin', around: (route, { method, options }) => (method === 'GET' || options.crossOrigin ? route : sameOrigin(route, options.cors)) },
  { name: 'signedIn', around: (route, { options, authenticator }) => (options.public ? route : signedIn(route, authenticator)) },
  { name: 'rateLimited', around: (route, { options }) => (options.rateLimit ? rateLimited(route, options.rateLimit) : route) },
  { name: 'idempotent', around: (route, { method, options, keeping }) => (options.idempotency && method === 'POST' ? idempotent(route, keeping(options.idempotency)) : route) },
]
