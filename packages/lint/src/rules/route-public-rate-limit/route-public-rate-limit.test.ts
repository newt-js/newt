import { asRule }               from '../../testing/testing'
import { tester }               from '../../testing/testing'
import { routePublicRateLimit } from './route-public-rate-limit'

const ROUTES = '/repo/src/contexts/ws/modules/order/order.routes.ts'

tester.run('route-public-rate-limit', asRule(routePublicRateLimit), {
  valid: [
    { code: "router.post('/orders', handler, { public: true, rateLimit: { limit: tries, by: 'ip' } })", filename: ROUTES },
    { code: "router.post('/orders', handler)", filename: ROUTES },
    { code: "router.post('/orders', handler, { public: false })", filename: ROUTES },
    // A GET only reads.
    { code: "router.get('/orders', handler, { public: true })", filename: ROUTES },
    { code: "const options = { public: true, rateLimit }; router.delete('/orders/current', handler, options)", filename: ROUTES },
    // Options it cannot see say nothing.
    { code: "router.post('/orders', handler, optionsFromElsewhere)", filename: ROUTES },
    { code: "router.post('/orders', handler, { public: true, ...limited })", filename: ROUTES },
    // Only routes files.
    { code: "client.post('/orders', body, { public: true })", filename: '/repo/src/contexts/ws/modules/order/order.module.ts' },
  ],
  invalid: [
    { code: "router.post('/orders', handler, { public: true })", filename: ROUTES, errors: [{ messageId: 'limit', data: { method: 'POST' } }] },
    { code: "router.delete('/sessions/current', handler, { public: true, crossOrigin: true })", filename: ROUTES, errors: [{ messageId: 'limit', data: { method: 'DELETE' } }] },
    { code: "const options = { public: true }; router.put('/orders/:id', handler, options)", filename: ROUTES, errors: [{ messageId: 'limit' }] },
    { code: "group.patch('/x', handler, { 'public': true })", filename: ROUTES, errors: [{ messageId: 'limit' }] },
  ],
})
