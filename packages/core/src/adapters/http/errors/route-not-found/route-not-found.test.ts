import { describe }      from 'bun:test'
import { expect }        from 'bun:test'
import { test }          from 'bun:test'
// --------------------------------------------------------
import { RouteNotFound } from './route-not-found'

describe('RouteNotFound', () => {
  test('is a not_found error that says why', () => {
    const error = new RouteNotFound('GET', '/api/nothing')

    expect([error.kind, error.code]).toEqual(['not_found', 'route_not_found'])
    expect(error.message).toBe('No route GET /api/nothing')
    expect(error.params).toEqual({ method: 'GET', path: '/api/nothing' })
  })
})
