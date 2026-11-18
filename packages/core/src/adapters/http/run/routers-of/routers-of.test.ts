import { describe }          from 'bun:test'
import { expect }            from 'bun:test'
import { test }              from 'bun:test'
// --------------------------------------------------------
import { HttpRouter }        from '../../router/http-router/http-router'
import type { ContextToRun } from '../run-contexts-options'
import { routersOf }         from './routers-of'

const named = (name: string) => ({ name }) as ContextToRun['context']

describe('routersOf', () => {
  test('gives each context\'s router, and leaves out a context without one', () => {
    const auth = new HttpRouter({ prefix: '/auth/api' })
    const boards = new HttpRouter({ prefix: '/boards/api' })

    expect(routersOf([{ context: named('auth'), router: auth }, { context: named('quiet') }, { context: named('boards'), router: boards }])).toEqual([auth, boards])
  })

  test('refuses a router that is not under /<context>/api', () => {
    expect(() => routersOf([{ context: named('sales'), router: new HttpRouter() }])).toThrow('sales\'s router is at /api: a context\'s routes go under /sales/api')
  })
})
