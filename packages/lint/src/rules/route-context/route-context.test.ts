import { MODULE }       from '../../testing/testing'
import { asRule }       from '../../testing/testing'
import { tester }       from '../../testing/testing'
import { routeContext } from './route-context'

const ROUTES = `${MODULE}/price-change.routes.ts`

tester.run('route-context', asRule(routeContext), {
  valid: [
    { code: "router.get('/ws/price-changes', handle)", filename: ROUTES },
    { code: "router.post('/ws/price-changes/:id/apply', handle)", filename: ROUTES },
    { code: 'router.get(`/ws`, handle)', filename: ROUTES },
    { code: 'router.get(path, handle)', filename: ROUTES },
    { code: "router.get('/price-changes', handle)", filename: `${MODULE}/price-change.module.ts` },
    { code: "router.get('/ws/x', request => request.headers.get('if-none-match'))", filename: ROUTES },
    { code: "router.group('/ws/mine').get('/price-changes', handle)", filename: ROUTES },
    { code: "export function register(http: HttpRouter) { http.get('/ws/price-changes', handle) }", filename: ROUTES },
  ],
  invalid: [
    { code: "router.get('/price-changes', handle)", filename: ROUTES, errors: [{ messageId: 'context', data: { path: '/price-changes', context: 'ws' } }] },
    { code: "router.delete('/wss/price-changes', handle)", filename: ROUTES, errors: [{ messageId: 'context' }] },
    { code: 'router.put(`/price-changes/:id`, handle)', filename: ROUTES, errors: [{ messageId: 'context' }] },
    { code: "router.group('/elsewhere').get('/ws/price-changes', handle)", filename: ROUTES, errors: [{ messageId: 'context', data: { path: '/elsewhere', context: 'ws' } }] },
    { code: "export function register(http: HttpRouter) { http.get('/price-changes', handle) }", filename: ROUTES, errors: [{ messageId: 'context' }] },
  ],
})
