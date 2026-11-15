import { describe } from 'bun:test'
import { expect }   from 'bun:test'
import { test }     from 'bun:test'
// --------------------------------------------------------
import { proxied }  from './proxied'

describe('proxied', () => {
  test('each prefix takes itself and all under it', () => {
    expect(Object.keys(proxied({ '/api/': 'http://backend.test' }))).toEqual(['/api', '/api/*'])
  })

  test('the root takes everything', () => {
    expect(Object.keys(proxied({ '/': 'http://backend.test' }))).toEqual(['/*'])
  })

  test('both of a prefix go to one proxy', () => {
    const routes = proxied({ '/api': 'http://backend.test' }) as Record<string, unknown>

    expect(typeof routes['/api']).toBe('function')
    expect(routes['/api']).toBe(routes['/api/*'])
  })

  test('no proxy, no routes; a path that does not start with / is refused', () => {
    expect(proxied(undefined)).toEqual({})
    expect(() => proxied({ api: 'http://backend.test' })).toThrow('starts with /')
  })
})
