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
  ],
  invalid: [
    { code: "router.get('/price-changes', handle)", filename: ROUTES, errors: [{ messageId: 'context', data: { path: '/price-changes', context: 'ws' } }] },
    { code: "router.delete('/wss/price-changes', handle)", filename: ROUTES, errors: [{ messageId: 'context' }] },
    { code: 'router.put(`/price-changes/:id`, handle)', filename: ROUTES, errors: [{ messageId: 'context' }] },
  ],
})
