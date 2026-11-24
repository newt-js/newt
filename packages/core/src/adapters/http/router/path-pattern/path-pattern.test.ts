import { describe }    from 'bun:test'
import { expect }      from 'bun:test'
import { test }        from 'bun:test'
// --------------------------------------------------------
import { PathPattern } from './path-pattern'
import { partsOf }     from './path-pattern'

const match = (path: string, pathname: string) => new PathPattern(path).match(partsOf(pathname)!)

describe('PathPattern', () => {
  test('matches its own path, giving its params\' values in order', () => {
    expect(match('/api/things/:id/parts/:part', '/api/things/7/parts/a%20b')).toEqual(['7', 'a b'])
    expect(match('/api/things', '/api/things')).toEqual([])
  })

  test('no other: longer, shorter, other letters, an empty param', () => {
    expect(['/api/things/7/x', '/api', '/API/things/7', '/api/things/'].map(pathname => match('/api/things/:id', pathname))).toEqual([null, null, null, null])
  })

  test('* at its end takes anything under it, but not itself', () => {
    expect(match('/api/*', '/api/a/b')).toEqual([])
    expect(match('/api/*', '/api')).toBeNull()
  })

  test('\'\' is the root\'s own: no segments', () => {
    expect(new PathPattern('').segments).toEqual([])
  })

  test('paths that differ only in their params\' names have one shape, each its own names', () => {
    const [a, b] = [new PathPattern('/things/:id'), new PathPattern('/things/:thingId')]

    expect(a.shape).toBe(b.shape)
    expect([a.names, b.names]).toEqual([['id'], ['thingId']])
  })

  test('a static segment outranks a param, and a param a *', () => {
    expect(new PathPattern('/things/new').outranks(new PathPattern('/things/:id'))).toBe(true)
    expect(new PathPattern('/things/:id').outranks(new PathPattern('/*'))).toBe(true)
    expect(new PathPattern('/*').outranks(new PathPattern('/things'))).toBe(false)
  })

  test('refuses a path that does not begin with /, or with * before its end', () => {
    expect(() => new PathPattern('things')).toThrow("begins with '/'")
    expect(() => new PathPattern('/*/things')).toThrow("'*' only at its end")
  })

  test('matches the start of a path that goes on from it, an empty param too', () => {
    const start = (pathname: string) => new PathPattern('/api/things/:id').matchStart(partsOf(pathname)!)

    expect(['/api/things/7', '/api/things/7/parts/a', '/api/things//parts'].map(start)).toEqual([['7'], ['7'], ['']])
    expect(['/api/things', '/api/others/7', '/API/things/7'].map(start)).toEqual([null, null, null])
  })

  test('covers the routes at it and under it, and those with a param or a * that may be there', () => {
    const covers = (path: string) => new PathPattern('/things/:id/parts').covers(new PathPattern(path))

    expect(['/things/:id/parts', '/things/:thingId/parts/:part', '/things/*', '/:kind/:id/:what', '/things/:id/:what'].filter(path => !covers(path))).toEqual([])
    expect(['/things/:id', '/things/new/parts', '/others/:id/parts', '/things/:id/others', ''].filter(covers)).toEqual([])
  })

  test('a pathname that cannot be decoded has no parts', () => {
    expect(partsOf('/api/%E0%A4%A')).toBeNull()
  })
})
