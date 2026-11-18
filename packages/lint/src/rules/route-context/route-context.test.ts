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
    { code: "router.get('/price-changes', handle)", filename: ROUTES },
    { code: "router.post('/price-changes/:id/apply', handle)", filename: ROUTES },
    { code: 'router.put(`/price-changes/:id`, handle)', filename: ROUTES },
    { code: "router.delete('/wss/price-changes', handle)", filename: ROUTES },
    { code: "router.get('/x', request => request.headers.get('if-none-match'))", filename: ROUTES },
    { code: "router.group('/mine').get('/price-changes', handle)", filename: ROUTES },
    { code: "export function register(http: HttpRouter) { http.get('/price-changes', handle) }", filename: ROUTES },
    { code: "router.get('/ws/price-changes', handle)", filename: `${MODULE}/price-change.module.test.ts` },
    { code: "router.get('/ws/price-changes', handle)", filename: '/repo/src/stores.ts' },
  ],
  invalid: [
    { code: "router.get('/ws/price-changes', handle)", filename: ROUTES, errors: [{ messageId: 'context', data: { path: '/ws/price-changes', context: 'ws', without: '/price-changes' } }] },
    { code: "router.get('/ws/price-changes', handle)", filename: `${MODULE}/price-change.module.ts`, errors: [{ messageId: 'context' }] },
    { code: 'router.get(`/ws`, handle)', filename: ROUTES, errors: [{ messageId: 'context', data: { path: '/ws', context: 'ws', without: '/' } }] },
    { code: "router.group('/ws').get('/price-changes', handle)", filename: ROUTES, errors: [{ messageId: 'context', data: { path: '/ws', context: 'ws', without: '/' } }] },
    { code: "export function register(http: HttpRouter) { http.get('/ws/price-changes', handle) }", filename: ROUTES, errors: [{ messageId: 'context' }] },
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
      "const BASE = '/price-changes'",
      'const PATHS = { one: `${BASE}/:id` }',
      'export function register(http: HttpRouter, path: string) {',
      '  http.get(BASE, handle)',
      '  http.get(PATHS.one, handle)',
      "  http.post(BASE + '/apply', handle)",
      "  const mine = http.group('/mine')",
      "  mine.get('/orders', handle)",
      "  http.group('/wss').post('/others', handle)",
      '  http.get(path, handle)',
      '}',
    ].join('\n'),
    [`${CONTEXTS}/ws/ws-modules.ts`]: "export function more(http: HttpRouter) {\n  http.get('/more', handle)\n}",
  })
  const bad = typed({
    [`${CONTEXTS}/ws/modules/price-change/price-change.routes.ts`]: [
      "const BASE = '/ws/price-changes'",
      'export function register(http: HttpRouter) {',
      '  http.get(BASE, handle)',
      '  http.get(`${BASE}/:id`, handle)',
      "  http.group('/ws').get('/price-changes', handle)",
      '}',
    ].join('\n'),
    [`${CONTEXTS}/ws/ws-modules.ts`]: "export function more(http: HttpRouter) {\n  http.get('/ws/more', handle)\n}",
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
        { messageId: 'context', data: { path: '/ws/price-changes', context: 'ws', without: '/price-changes' } },
        { messageId: 'context', data: { path: '/ws/price-changes/:id', context: 'ws', without: '/price-changes/:id' } },
        { messageId: 'context', data: { path: '/ws/price-changes', context: 'ws', without: '/price-changes' } },
      ] },
      { ...bad.cases[1]!, errors: [{ messageId: 'context', data: { path: '/ws/more', context: 'ws', without: '/more' } }] },
    ],
  })
})
