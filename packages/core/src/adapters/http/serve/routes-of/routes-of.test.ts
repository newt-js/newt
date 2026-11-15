import { describe }   from 'bun:test'
import { expect }     from 'bun:test'
import { test }       from 'bun:test'
// --------------------------------------------------------
import { HttpRouter } from '../../router/http-router/http-router'
import { routesOf }   from './routes-of'

describe('routesOf', () => {
  test('every path of every router, and its prefix, goes to the one answer', () => {
    const router = new HttpRouter()
    router.get('/things', () => new Response('ok'), { public: true })
    const answer = () => new Response('the answer')

    const routes = routesOf([router], answer)

    expect(Object.keys(routes).toSorted()).toEqual(['/api', '/api/*', '/api/things'])
    expect(Object.values(routes).every(each => each === answer)).toBe(true)
  })

  test('no routers, no routes', () => {
    expect(routesOf([], () => new Response())).toEqual({})
  })
})
