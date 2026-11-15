import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { HttpRouter }    from '../../router/http-router/http-router'
import { ContextToRun }  from '../run-contexts-options'
import { sharedRouters } from './shared-routers'

function routerOf(path: string, prefix?: string): HttpRouter {
  const router = new HttpRouter(prefix === undefined ? {} : { prefix })
  router.get(path, () => new Response('ok'), { public: true })
  return router
}

const named = (name: string) => ({ name }) as ContextToRun['context']

describe('sharedRouters', () => {
  test('the routers of the contexts that have one, in their order', () => {
    const auth = routerOf('/session')
    const boards = routerOf('/boards')

    expect(sharedRouters([{ context: named('auth'), router: auth }, { context: named('quiet') }, { context: named('boards'), router: boards }])).toEqual([auth, boards])
  })

  test('two contexts may share the prefix, but not a path, even under other names for its params', () => {
    expect(() => sharedRouters([{ context: named('auth'), router: routerOf('/things/:id') }, { context: named('boards'), router: routerOf('/things/:thingId') }]))
      .toThrow('auth and boards both take /api/things/:thingId')
  })

  test('routers at different prefixes take paths that would clash under one', () => {
    expect(sharedRouters([{ context: named('auth'), router: routerOf('/x', '/a') }, { context: named('boards'), router: routerOf('/x', '/b') }])).toHaveLength(2)
  })
})
