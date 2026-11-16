import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { it }            from 'bun:test'
// --------------------------------------------------------
import { MODULE }        from '../../testing/testing'
import { asRule }        from '../../testing/testing'
import { diagnosticsOf } from '../../testing/testing'
import { programOf }     from '../../testing/testing'
import { tester }        from '../../testing/testing'
import { typedTester }   from '../../testing/testing'
import { routeContext }  from './route-context'

const ROUTES = `${MODULE}/price-change.routes.ts`

tester.run('route-context', asRule(routeContext), {
  valid: [
    { code: "router.get('/ws/price-changes', handle)", filename: ROUTES },
    { code: "router.post('/ws/price-changes/:id/apply', handle)", filename: ROUTES },
    { code: 'router.get(`/ws`, handle)', filename: ROUTES },
    { code: "router.get('/ws/x', request => request.headers.get('if-none-match'))", filename: ROUTES },
    { code: "router.group('/ws/mine').get('/price-changes', handle)", filename: ROUTES },
    { code: "export function register(http: HttpRouter) { http.get('/ws/price-changes', handle) }", filename: ROUTES },
    { code: "router.get('/price-changes', handle)", filename: `${MODULE}/price-change.module.test.ts` },
    { code: "router.get('/price-changes', handle)", filename: '/repo/src/stores.ts' },
  ],
  invalid: [
    { code: "router.get('/price-changes', handle)", filename: ROUTES, errors: [{ messageId: 'context', data: { path: '/price-changes', context: 'ws' } }] },
    { code: "router.get('/price-changes', handle)", filename: `${MODULE}/price-change.module.ts`, errors: [{ messageId: 'context' }] },
    { code: "router.delete('/wss/price-changes', handle)", filename: ROUTES, errors: [{ messageId: 'context' }] },
    { code: 'router.put(`/price-changes/:id`, handle)', filename: ROUTES, errors: [{ messageId: 'context' }] },
    { code: "router.group('/elsewhere').get('/ws/price-changes', handle)", filename: ROUTES, errors: [{ messageId: 'context', data: { path: '/elsewhere', context: 'ws' } }] },
    { code: "export function register(http: HttpRouter) { http.get('/price-changes', handle) }", filename: ROUTES, errors: [{ messageId: 'context' }] },
  ],
})

const ROUTER = `
declare class HttpGroup<P extends string> { get(path: string, route: unknown): void; post(path: string, route: unknown): void }
declare class HttpRouter { get(path: string, route: unknown): void; post(path: string, route: unknown): void; group<P extends string>(prefix: P, middleware?: unknown): HttpGroup<P> }
declare const handle: unknown
`

const CONTEXTS = '/repo/src/contexts'

const typed = (files: Record<string, string>) => {
  const program = programOf(Object.fromEntries(Object.entries(files).map(([path, code]) => [path, `${ROUTER}${code}`])))
  return { program, cases: Object.entries(files).map(([filename, code]) => ({ filename, code: `${ROUTER}${code}`, options: [{ folder: CONTEXTS }] })) }
}

describe('route-context, with types', () => {
  const good = typed({
    [`${CONTEXTS}/ws/modules/price-change/price-change.routes.ts`]: [
      "const BASE = '/ws/price-changes'",
      'const PATHS = { one: `${BASE}/:id` }',
      'export function register(http: HttpRouter) {',
      '  http.get(BASE, handle)',
      '  http.get(PATHS.one, handle)',
      "  http.post(BASE + '/apply', handle)",
      "  const mine = http.group('/ws/mine')",
      "  mine.get('/orders', handle)",
      "  http.group('/ws').post('/others', handle)",
      '}',
    ].join('\n'),
    [`${CONTEXTS}/ws/ws-modules.ts`]: "export function more(http: HttpRouter) {\n  http.get('/ws/more', handle)\n}",
  })
  const bad = typed({
    [`${CONTEXTS}/ws/modules/price-change/price-change.routes.ts`]: [
      "const BASE = '/price-changes'",
      'export function register(http: HttpRouter, path: string) {',
      '  http.get(BASE, handle)',
      '  http.get(`${BASE}/:id`, handle)',
      "  http.group('/elsewhere').get('/ws/price-changes', handle)",
      '  http.get(path, handle)',
      '}',
    ].join('\n'),
    [`${CONTEXTS}/ws/ws-modules.ts`]: "export function more(http: HttpRouter) {\n  http.get('/more', handle)\n}",
  })

  it('types every file it is given', () => {
    expect(diagnosticsOf(good.program)).toEqual([])
    expect(diagnosticsOf(bad.program)).toEqual([])
  })

  typedTester(good.program).run('route-context', asRule(routeContext), { valid: good.cases, invalid: [] })
  typedTester(bad.program).run('route-context', asRule(routeContext), {
    valid: [],
    invalid: [
      { ...bad.cases[0]!, errors: [
        { messageId: 'context', data: { path: '/price-changes', context: 'ws' } },
        { messageId: 'context', data: { path: '/price-changes/:id', context: 'ws' } },
        { messageId: 'context', data: { path: '/elsewhere/ws/price-changes', context: 'ws' } },
        { messageId: 'unreadable', data: { context: 'ws' } },
      ] },
      { ...bad.cases[1]!, errors: [{ messageId: 'context', data: { path: '/more', context: 'ws' } }] },
    ],
  })
})
